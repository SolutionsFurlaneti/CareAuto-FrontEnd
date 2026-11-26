import express from 'express';
import { request as httpRequest, type Server } from 'node:http';
import { mkdtemp, mkdir, realpath, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  isSpaNavigation,
  productionSecurityHeaders,
  rejectPrivateFiles,
} from '../../server/webSecurity';

let server: Server;
let directory: string;
let port: number;
const canonical = '/.well-known/security.txt';

function get(url: string, headers: Record<string, string> = {}) {
  return new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
  }>((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port, path: url, headers }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        body += chunk;
      });
      response.on('end', () =>
        resolve({ status: response.statusCode ?? 0, headers: response.headers, body }),
      );
    });
    request.on('error', reject);
    request.end();
  });
}

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'careauto-web-security-'));
  await mkdir(path.join(directory, '.ssh'));
  await writeFile(path.join(directory, '.ssh', 'authorized_keys'), 'PRIVATE_RESOURCE_FIXTURE');
  await writeFile(path.join(directory, 'fullchain.pem'), 'CERTIFICATE_FIXTURE');
  const app = express();
  app.set('trust proxy', 'loopback');
  app.use(productionSecurityHeaders, rejectPrivateFiles);
  app.get('/security.txt', (_request, response) => response.redirect(301, canonical));
  app.get(canonical, async (_request, response) => {
    response
      .type('text/plain; charset=utf-8')
      .send(await readFile(path.resolve('public/.well-known/security.txt'), 'utf8'));
  });
  app.use(express.static(directory, { dotfiles: 'allow' }));
  app.get('/{*route}', (request, response) => {
    if (isSpaNavigation(request.path)) response.type('html').send('<div id="root">SPA</div>');
    else response.status(404).type('text/plain').send('Not found');
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP address');
  port = address.port;
});

afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  if (directory) {
    const resolved = await realpath(directory);
    const temporaryRoot = await realpath(tmpdir());
    if (
      path.dirname(resolved) !== temporaryRoot ||
      !path.basename(resolved).startsWith('careauto-web-security-')
    ) {
      throw new Error('Unexpected temporary fixture path; cleanup refused');
    }
    await rm(resolved, { recursive: true, force: true });
  }
});

describe('production web security over HTTP', () => {
  it('preserves real application navigation and denies unpublished resources instead of the SPA shell', async () => {
    for (const route of ['/login', '/backoffice/login', '/integracoes/claude', '/auth/callback']) {
      expect((await get(route)).status, route).toBe(200);
    }
    for (const route of [
      '/info',
      '/_status',
      '/healthz',
      '/version',
      '/oauth/token',
      '/wp-json/wp/v2/users',
      '/xmlrpc.php',
      '/build.txt',
      '/sitemap.xml',
      '/.well-known/openid-configuration',
      '/assets/missing.js',
    ]) {
      const response = await get(route);
      expect(response.status, route).toBe(404);
      expect(response.body, route).not.toContain('id="root"');
    }
  });

  it('denies private/certificate files even if mistakenly present in the static directory', async () => {
    for (const route of [
      '/.ssh/authorized_keys',
      '/%2Essh/authorized_keys',
      '/fullchain.pem',
      '/.env.local',
    ]) {
      const response = await get(route);
      expect(response.status, route).toBe(404);
      expect(response.body).not.toMatch(/PRIVATE_RESOURCE_FIXTURE|CERTIFICATE_FIXTURE/);
    }
  });

  it('keeps framing/CSP/nosniff on successful, missing and redirect responses', async () => {
    for (const route of ['/', '/fullchain.pem', '/security.txt', canonical]) {
      const response = await get(route);
      expect(response.headers['x-content-type-options'], route).toBe('nosniff');
      expect(response.headers['x-frame-options'], route).toBe('SAMEORIGIN');
      expect(response.headers['content-security-policy'], route).toContain(
        "frame-ancestors 'self'",
      );
      const scriptPolicy = String(response.headers['content-security-policy'])
        .split(';')
        .find((value) => value.trim().startsWith('script-src '));
      expect(scriptPolicy).not.toMatch(/unsafe-inline|unsafe-eval/);
    }
  });

  it('sends HSTS only on HTTPS as reported by the trusted TLS proxy', async () => {
    expect((await get('/')).headers['strict-transport-security']).toBeUndefined();
    expect(
      (await get('/', { 'X-Forwarded-Proto': 'https' })).headers['strict-transport-security'],
    ).toContain('max-age=31536000');
  });

  it('serves a distinct UTF-8 security policy with a real contact and future expiration', async () => {
    const response = await get(canonical);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/plain; charset=utf-8/);
    expect(response.body).toMatch(/^Contact: (https:\/\/|mailto:|tel:)\S+/m);
    expect(response.body).toContain('Canonical: https://careauto.online/.well-known/security.txt');
    const expires = response.body.match(/^Expires: (.+)$/m)?.[1];
    expect(expires).toBeDefined();
    expect(Date.parse(expires!)).toBeGreaterThan(Date.now());
    expect((await get('/security.txt')).headers.location).toBe(canonical);
  });
});
