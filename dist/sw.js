// VisionTech StockFlow - Service Worker 100% Offline-First (Spécial Sahel - Zéro Connexion Requise)
// Généré automatiquement lors de la compilation
const CACHE_NAME = 'visiontech-cache-v20261108231531';

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon.png",
  "./assets/icon-BdGb-u5G.png",
  "./assets/index-BwMVYM8p.js",
  "./assets/index-uJL0Cj8H.css",
  "./assets/manifest-C3gAr6a6.json"
];

// Coquille HTML complète embarquée directement dans le Service Worker :
// Garantit à 100% que l'application s'ouvre instantanément sans connexion, même si le cache navigateur a été vidé !
const FALLBACK_HTML = "<!doctype html>\r\n<html lang=\"fr\">\r\n  <head>\r\n    <meta charset=\"UTF-8\" />\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\r\n    <title>Boutique VisionTech - Gestion de Stock & Caisse</title>\r\n    <meta name=\"description\" content=\"Application Boutique VisionTech : gestion de stock, encaissement caisse, multi-boutiques et comptabilité. Fonctionne 100% hors-ligne.\" />\r\n    <meta property=\"og:title\" content=\"Boutique VisionTech - Gestion de Stock & Caisse\" />\r\n    <meta property=\"og:description\" content=\"Application Boutique VisionTech : gestion de stock, encaissement caisse, multi-boutiques et comptabilité. Fonctionne 100% hors-ligne.\" />\r\n    <meta property=\"og:type\" content=\"website\" />\r\n    <meta name=\"twitter:card\" content=\"summary_large_image\" />\r\n    <meta name=\"theme-color\" content=\"#2563eb\" />\r\n    <meta name=\"mobile-web-app-capable\" content=\"yes\" />\r\n    <meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\r\n    <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\" />\r\n    <link rel=\"manifest\" href=\"./manifest.json\" />\r\n    <link rel=\"icon\" type=\"image/png\" href=\"./icon.png\" />\r\n    <link rel=\"apple-touch-icon\" href=\"./icon.png\" />\r\n    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\r\n    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\r\n    <link href=\"https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap\" rel=\"stylesheet\" media=\"print\" onload=\"this.media='all'\">\r\n    \r\n    <script>\r\n      // 1. Détection ouverture locale file:// (double-clic direct sur PC)\r\n      if (window.location.protocol === 'file:') {\r\n        window.addEventListener('DOMContentLoaded', () => {\r\n          document.body.innerHTML = `\r\n            <div style=\"font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #090d16; color: white; padding: 20px; text-align: center;\">\r\n              <div style=\"max-width: 520px; background: #131c2e; padding: 32px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); border: 1px solid #1e293b;\">\r\n                <div style=\"font-size: 56px; margin-bottom: 16px;\">🌐</div>\r\n                <h2 style=\"font-size: 22px; font-weight: 800; margin-bottom: 12px; color: #f8fafc;\">Ouverture sur Ordinateur</h2>\r\n                <p style=\"font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;\">\r\n                  Les navigateurs bloquent l'exécution directe en double-cliquant sur un fichier local pour des raisons de sécurité. Pour ouvrir votre boutique avec la synchronisation Cloud :\r\n                </p>\r\n                <a href=\"https://ibrahimdiallogorom-design.github.io/gestion-stock/\" style=\"display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 14px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 10px 20px -5px rgba(37,99,235,0.4);\">\r\n                  👉 Ouvrir la Boutique VisionTech en Ligne\r\n                </a>\r\n                <p style=\"font-size: 12px; color: #64748b; margin-top: 20px;\">\r\n                  Lien officiel : https://ibrahimdiallogorom-design.github.io/gestion-stock/\r\n                </p>\r\n              </div>\r\n            </div>\r\n          `;\r\n        });\r\n      }\r\n    </script>\r\r\n    <script type=\"module\" crossorigin src=\"./assets/index-BwMVYM8p.js\"></script>\n    <link rel=\"stylesheet\" crossorigin href=\"./assets/index-uJL0Cj8H.css\">\n  </head>\r\n  <body class=\"bg-slate-50 text-slate-900 antialiased font-sans\">\r\n    <div id=\"root\"></div>\r\n    <script>\r\n      // Enregistrement du Service Worker pour fonctionnement 100% Hors-Ligne (Spécial Sahel)\r\n      if ('serviceWorker' in navigator) {\r\n        window.addEventListener('load', () => {\r\n          navigator.serviceWorker.register('./sw.js').then((registration) => {\r\n            if (navigator.onLine) {\r\n              registration.update().catch(() => {});\r\n            }\r\n          }).catch((err) => {\r\n            console.warn('Service worker registration warning:', err);\r\n          });\r\n\r\n          navigator.serviceWorker.addEventListener('message', (event) => {\r\n            if (event.data && event.data.action === 'RELOAD_NOW' && navigator.onLine) {\r\n              window.location.reload();\r\n            }\r\n          });\r\n        });\r\n      }\r\n    </script>\r\n  </body>\r\n</html>\r\n";

// 1. Installation immédiate : téléchargement et mise en cache de TOUS les fichiers de l'application
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Mise en cache complète de l\'application pour fonctionnement 100% hors-ligne...');
      // Stocker immédiatement la coquille HTML embarquée sous ./ et ./index.html
      if (FALLBACK_HTML) {
        try {
          await cache.put(
            './index.html',
            new Response(FALLBACK_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
          );
          await cache.put(
            './',
            new Response(FALLBACK_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
          );
        } catch (e) {}
      }
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

// 2. Activation immédiate : prise de contrôle de tous les onglets ouverts
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        // Conserver le cache actuel et le précédent pour éviter toute perte hors-ligne
        const visionKeys = keys.filter((k) => k.startsWith('visiontech-')).sort();
        const keysToDelete = visionKeys.filter((k) => k !== CACHE_NAME).slice(0, -1);
        return Promise.all(keysToDelete.map((k) => caches.delete(k)));
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

// 4. Interception des requêtes : STRATÉGIE 100% INSTANT CACHE-FIRST (OUVERTURE EN 0.01s SANS CONNEXION)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorer les requêtes d'API Firebase Firestore / Auth (gérées par le moteur IndexedDB / Offline Queue)
  if (
    request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('googleapis.com/google.firestore')
  ) {
    return;
  }

  // Police Google Fonts : Cache-First avec secours immédiat vide si hors-ligne (ne bloque jamais l'affichage)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cachedFont) => {
        if (cachedFont) return cachedFont;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1500);
        return fetch(request, { signal: ctrl.signal })
          .then((res) => {
            clearTimeout(tid);
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
          .catch(() => {
            clearTimeout(tid);
            return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
          });
      })
    );
    return;
  }

  // A. Navigation HTML (Ouverture de l'application / APK / PWA) :
  // OUVERTURE INSTANTANÉE DEPUIS LE CACHE LOCAL (0 ms d'attente réseau !) + Mise à jour silencieuse en arrière-plan
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        const cachedPage =
          (await caches.match('./index.html', { ignoreSearch: true })) ||
          (await caches.match('./', { ignoreSearch: true })) ||
          (await caches.match(request, { ignoreSearch: true }));

        // Mise à jour silencieuse en arrière-plan (avec timeout court de 4s pour les connexions 2G du Sahel)
        const backgroundFetch = (async () => {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const networkRes = await fetch(request, { cache: 'no-store', signal: controller.signal });
            clearTimeout(timer);
            if (networkRes && networkRes.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put('./index.html', networkRes.clone());
              await cache.put('./', networkRes.clone());
              await cache.put(request, networkRes.clone());
              return networkRes;
            }
          } catch (e) {
            // Hors-ligne ou réseau trop faible : aucun blocage
          }
          return null;
        })();

        event.waitUntil(backgroundFetch);

        // Si la page est déjà en cache local, l'afficher IMMÉDIATEMENT sans attendre Internet !
        if (cachedPage) {
          return cachedPage;
        }

        // Sinon, essayer le réseau (max 4s), et en cas d'absence de réseau, renvoyer FALLBACK_HTML embarqué !
        const netRes = await backgroundFetch;
        if (netRes) return netRes;

        return new Response(FALLBACK_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })()
    );
    return;
  }

  // B. Fichiers statiques internes (JS, CSS, PNG, JSON, etc.) : 100% Cache-First avec recherche multi-clé
  event.respondWith(
    (async () => {
      const exactMatch = await caches.match(request, { ignoreSearch: true });
      if (exactMatch) return exactMatch;

      // Recherche par nom de fichier dans ./assets/ au cas où l'URL relative diffère sur mobile / APK
      const fileName = url.pathname.split('/').pop();
      if (fileName) {
        const byAssetPath =
          (await caches.match('./assets/' + fileName, { ignoreSearch: true })) ||
          (await caches.match('./' + fileName, { ignoreSearch: true }));
        if (byAssetPath) return byAssetPath;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      } catch (err) {
        if (request.destination === 'document' && FALLBACK_HTML) {
          return new Response(FALLBACK_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        return new Response('', { status: 200, statusText: 'Offline Cached Fallback' });
      }
    })()
  );
});

// 5. Synchronisation en arrière-plan (Background Sync & Periodic Sync pour PWABuilder & Sahel)
self.addEventListener('sync', (event) => {
  if (event.tag === 'visiontech-sync' || event.tag === 'sync-stock') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ action: 'TRIGGER_CLOUD_SYNC' }));
      })
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'visiontech-periodic-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ action: 'TRIGGER_CLOUD_SYNC' }));
      })
    );
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
