// Boutique VisionTech Service Worker - Version Multi-Boutiques
const CACHE_NAME = 'visiontech-cache-v4-' + Date.now();

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
  // Always fetch fresh network first so user receives updates immediately upon page reload
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
