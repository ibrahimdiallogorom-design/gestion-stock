// VisionTech StockFlow - Service Worker 100% Offline-First
// Généré automatiquement lors de la compilation
const CACHE_NAME = 'visiontech-cache-v20261108224148';

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./favicon.png",
  "./assets/icon-BdGb-u5G.png",
  "./assets/index-72cRzbE0.css",
  "./assets/index-BcsRXssf.js",
  "./assets/manifest-CArwlgLB.json"
];

// 1. Installation immédiate : téléchargement et mise en cache de TOUS les fichiers de l'application
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Mise en cache complète de l\'application pour fonctionnement hors-ligne...');
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Avertissement ressource non bloquante :', asset, err);
        }
      }
    })
  );
});

// 2. Activation immédiate : prise de contrôle de tous les onglets ouverts et suppression des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((k) => {
            if (k.startsWith('visiontech-') && k !== CACHE_NAME) {
              console.log('[SW] Nettoyage ancien cache :', k);
              return caches.delete(k);
            }
          })
        );
      }),
    ])
  );
});

// 3. Purge manuelle demandée par l'utilisateur
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'PURGE_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ action: 'RELOAD_NOW' }));
      });
    });
  }
});

// 4. Interception des requêtes : STRATÉGIE CACHE-FIRST RADICALE POUR TOUT LE CONTENU LOCAL
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorer les requêtes externes Firebase Firestore / Auth (gérées directement par le SDK)
  if (
    request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // A. Navigation HTML : Network-First en ligne (pour afficher immédiatement les mises à jour), Cache-First hors-ligne
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone.clone());
              cache.put('./index.html', clone);
            });
            return networkRes;
          }
          return caches.match('./index.html');
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // B. Fichiers statiques internes (JS, CSS, PNG, JSON, etc.)
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Déjà en cache local : retourner immédiatement SANS attendre le réseau !
        return cachedResponse;
      }

      // Si pas encore en cache, chercher sur le réseau et sauvegarder pour les prochaines ouvertures
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // En cas d'échec hors-ligne sur une icône ou image secondaire
        return new Response('', { status: 408, statusText: 'Hors-Ligne' });
      });
    })
  );
});

// 5. Synchronisation en arrière-plan (Background Sync & Periodic Sync pour PWABuilder)
self.addEventListener('sync', (event) => {
  if (event.tag === 'visiontech-sync' || event.tag === 'sync-stock') {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'visiontech-periodic-sync') {
    event.waitUntil(Promise.resolve());
  }
});

// 6. Notifications Push (Web Push & Notification Click)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'VisionTech StockFlow', body: 'Mise à jour du stock disponible.' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'VisionTech StockFlow', {
      body: data.body || 'Notification Boutique VisionTech',
      icon: './icon-192.png',
      badge: './icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('./');
    })
  );
});
