/* SwiftSite install support. Never cache chat history, uploads or API replies. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  // Network-first only: every visitor's conversation stays private and fresh.
  event.respondWith(fetch(event.request));
});
