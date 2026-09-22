// Snake Sorter has its own worker scope. Never cache private pages or scan data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Snake Sorter</title><body style="background:#020705;color:white;font-family:system-ui;padding:32px"><h1>Snake Sorter</h1><p>You are offline. Reconnect to securely access your sorter.</p><a style="color:#7dd3fc" href="/snake-sorter">Try again</a></body></html>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  )));
});
