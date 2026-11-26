import type { RequestHandler } from 'express';
import configuration from '../public/staticwebapp.config.json' with { type: 'json' };

// Use the same policy in the optional Express host and Azure Static Web Apps.
function globExpression(pattern: string): RegExp {
  const alternatives = pattern.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (alternatives) {
    return new RegExp(
      `^(?:${alternatives[2]
        .split(',')
        .map((extension) =>
          globExpression(alternatives[1] + extension + alternatives[3]).source.slice(1, -1),
        )
        .join('|')})$`,
      'i',
    );
  }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

const excludedPaths = configuration.navigationFallback.exclude.map(globExpression);

export function isSpaNavigation(path: string): boolean {
  try {
    const decoded = decodeURIComponent(path);
    return !excludedPaths.some((pattern) => pattern.test(decoded));
  } catch {
    return false;
  }
}

export const productionSecurityHeaders: RequestHandler = (request, response, next) => {
  for (const [name, value] of Object.entries(configuration.globalHeaders)) {
    // HSTS is only sent over TLS, including a trusted loopback reverse proxy.
    if (name === 'Strict-Transport-Security' && !request.secure) continue;
    response.setHeader(name, value);
  }
  next();
};

export const rejectPrivateFiles: RequestHandler = (request, response, next) => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(request.path);
  } catch {
    response.status(400).type('text/plain').send('Bad request');
    return;
  }
  if (/^\/\.(?:ssh|git|env)(?:[/.]|$)|^\/(?:fullchain|privkey)\.pem$/i.test(decoded)) {
    response.status(404).type('text/plain').send('Not found');
    return;
  }
  next();
};
