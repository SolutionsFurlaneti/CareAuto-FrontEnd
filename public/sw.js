/* global self */

const OFFLINE_PAGE = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101715"><title>CareAuto</title></head>
  <body style="font:16px system-ui,sans-serif;background:#101715;color:#f4f7f5;padding:2rem">
    <main><h1>Sem conexão</h1><p>O CareAuto precisa de conexão para consultar dados e registrar operações. Conecte-se e tente novamente.</p></main>
  </body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).catch(
      () =>
        new Response(OFFLINE_PAGE, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        }),
    ),
  );
});

