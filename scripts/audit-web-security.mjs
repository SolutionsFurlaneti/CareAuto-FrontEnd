import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split(/=(.*)/s, 2)),
);
const origin = new URL(args.origin || 'https://careauto.online');
const apiOrigin = new URL(args['api-origin'] || 'https://api.careauto.online');
if (
  !['http:', 'https:'].includes(origin.protocol) ||
  !['http:', 'https:'].includes(apiOrigin.protocol)
) {
  throw new Error('Use uma origem HTTP/HTTPS.');
}
const findings = [
  [1633, '/.well-known/security.txt'],
  [2059, '/security.txt'],
  [1668, '/apple-app-site-association'],
  [1708, '/build.txt'],
  [1715, '/CHANGELOG.md'],
  [1847, '/favicon.ico'],
  [1856, '/fullchain.pem'],
  [1887, '/healthz'],
  [1909, '/info'],
  [1910, '/_info'],
  [1979, '/oauth/token'],
  [2083, '/sitemap.xml'],
  [2097, '/.ssh/authorized_keys'],
  [2099, '/.ssh/id_rsa.pub'],
  [2103, '/status'],
  [2104, '/_status'],
  [2155, '/_version'],
  [2156, '/version'],
  [2170, '/.well-known/apple-app-site-association'],
  [2171, '/.well-known/openid-configuration'],
  [2197, '/wp-cron.php'],
  [2201, '/wp-json/wp/v2/users'],
  [2209, '/xmlrpc.php'],
];
const inconclusive = [
  [1659, '/api/health'],
  [1664, '/api/v1/publico/planos'],
  [1665, '/api/v1/version'],
];

function get(url, redirects = []) {
  if (redirects.length > 5) return Promise.reject(new Error('Muitos redirecionamentos.'));
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(
      url,
      { headers: { 'User-Agent': 'CareAuto-SEC-CAR-035-Verification/1.0' } },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const next = new URL(response.headers.location, url);
          response.resume();
          if (next.origin !== url.origin)
            return reject(new Error('Redirecionamento para outra origem.'));
          resolve(get(next, [...redirects, { url: url.href, status: response.statusCode }]));
          return;
        }
        const chunks = [];
        let bytes = 0;
        response.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > 2 * 1024 * 1024) request.destroy(new Error('Resposta excedeu 2 MB.'));
          else chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({
            url: url.href,
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            redirects,
          }),
        );
        response.on('error', reject);
      },
    );
    request.setTimeout(30000, () => request.destroy(new Error('Tempo de resposta excedido.')));
    request.on('error', reject);
  });
}

function headerFailures(response) {
  const problems = [];
  if (!response.headers['content-security-policy']) problems.push('missing CSP');
  if (!['DENY', 'SAMEORIGIN'].includes(response.headers['x-frame-options']))
    problems.push('missing framing protection');
  if (response.headers['x-content-type-options'] !== 'nosniff') problems.push('missing nosniff');
  if (
    new URL(response.url).protocol === 'https:' &&
    !/max-age=[1-9]\d*/.test(response.headers['strict-transport-security'] || '')
  )
    problems.push('missing HSTS');
  return problems;
}

function securityTxtFailures(response) {
  const failures = [];
  if (response.status !== 200) failures.push('security.txt must return 200');
  if (!/^text\/plain\s*;\s*charset=utf-8/i.test(response.headers['content-type'] || ''))
    failures.push('security.txt MIME/charset');
  const contacts = [...response.body.matchAll(/^Contact:\s*(\S+)\s*$/gim)].map((match) => match[1]);
  if (!contacts.some((contact) => /^(?:https:\/\/|mailto:|tel:)/i.test(contact)))
    failures.push('missing valid Contact URI');
  const expiration = [...response.body.matchAll(/^Expires:\s*(\S+)\s*$/gim)];
  const expires = expiration.length === 1 ? Date.parse(expiration[0][1]) : NaN;
  if (!Number.isFinite(expires) || expires <= Date.now())
    failures.push('missing/finalized Expires');
  if (Number.isFinite(expires) && expires > Date.now() + 366 * 86400000)
    failures.push('Expires exceeds one year');
  if (!response.body.includes(`Canonical: ${origin.origin}/.well-known/security.txt`))
    failures.push('Canonical does not match public origin');
  return failures;
}

const hash = (body) => createHash('sha256').update(body).digest('hex');
const home = await get(new URL('/', origin));
const homeHash = hash(home.body);
const rows = [];
for (const [findingId, route] of findings) {
  const response = await get(new URL(route, origin));
  const failures = headerFailures(response);
  if (route.endsWith('security.txt')) failures.push(...securityTxtFailures(response));
  else if (response.status !== 404) failures.push('unpublished resource must return 404');
  if (hash(response.body) === homeHash) failures.push('SPA fallback masquerades as resource');
  rows.push({
    findingId,
    route,
    status: response.status,
    finalUrl: response.url,
    redirects: response.redirects,
    contentType: response.headers['content-type'],
    bodySha256: hash(response.body),
    failures,
  });
}
const apiChecks = [];
for (const [findingId, route] of inconclusive) {
  const frontend = await get(new URL(route, origin));
  const api = await get(new URL(route === '/api/health' ? '/health/live' : route, apiOrigin));
  const expectedApiStatus = route === '/api/v1/version' ? 404 : 200;
  apiChecks.push({
    findingId,
    frontendRoute: route,
    frontendStatus: frontend.status,
    apiUrl: api.url,
    apiStatus: api.status,
    failures: [
      ...(frontend.status !== 404 ? ['unexpected frontend API alias'] : []),
      ...(api.status !== expectedApiStatus ? ['unexpected API status'] : []),
      ...headerFailures(api),
    ],
  });
}
const result = {
  checkedAt: new Date().toISOString(),
  origin: origin.origin,
  apiOrigin: apiOrigin.origin,
  home: { status: home.status, failures: headerFailures(home) },
  findings: rows,
  inconclusive: apiChecks,
  passed:
    home.status === 200 &&
    headerFailures(home).length === 0 &&
    rows.every((row) => row.failures.length === 0) &&
    apiChecks.every((row) => row.failures.length === 0),
};
if (args.output) {
  await mkdir(path.dirname(args.output), { recursive: true });
  await writeFile(args.output, JSON.stringify(result, null, 2) + '\n');
}
console.log(
  JSON.stringify(
    {
      origin: result.origin,
      findingsChecked: rows.length,
      passed: result.passed,
      failedRoutes: rows
        .filter((row) => row.failures.length)
        .map((row) => ({ route: row.route, failures: row.failures })),
      apiChecks: apiChecks.map(({ apiUrl, apiStatus, failures }) => ({
        apiUrl,
        apiStatus,
        failures,
      })),
    },
    null,
    2,
  ),
);
if (!result.passed) process.exitCode = 1;
