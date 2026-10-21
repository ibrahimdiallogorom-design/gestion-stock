// VisionTech StockFlow - Service Worker 100% Offline-First
// Généré automatiquement lors de la compilation
const CACHE_NAME = 'visiontech-cache-v20261021223343';

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./favicon.png",
  "./assets/icon-pnxEVMeK.png",
  "./assets/index-BA8Y9EGF.css",
  "./assets/index-PsXKgBgl.js",
  "./assets/manifest-Cu8MOF-8.json"
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

  // A. Navigation HTML (Ouverture de l'application ou rechargement de page hors-ligne)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match('./index.html').then((cachedIndex) => {
        if (cachedIndex) {
          // Si en ligne, tenter de mettre à jour index.html en tâche de fond
          if (navigator.onLine) {
            fetch(request).then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkRes.clone());
                  cache.put('./index.html', networkRes);
                });
              }
            }).catch(() => {});
          }
          return cachedIndex;
        }

        // Si pas en cache (première visite absolue), aller sur le réseau
        return fetch(request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone.clone());
              cache.put('./index.html', clone);
            });
          }
          return networkRes;
        });
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
