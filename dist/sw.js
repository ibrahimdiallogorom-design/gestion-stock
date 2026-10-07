// StockFlow Service Worker - Version Multi-Boutiques & Cloud Automatique
const CACHE_NAME = 'stockflow-cache-v5-' + Date.now();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch fresh network first so updates are instant upon reload
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
