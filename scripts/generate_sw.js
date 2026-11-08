import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const assetsDir = path.resolve(distDir, 'assets');

// Ensure dist exists
if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist. Run vite build first.');
  process.exit(1);
}

// 1. Fix dist/index.html FIRST so manifest.json points to ./manifest.json (not ./assets/manifest-*.json)
const distIndexPath = path.resolve(distDir, 'index.html');
let compiledHtml = '';
if (fs.existsSync(distIndexPath)) {
  compiledHtml = fs.readFileSync(distIndexPath, 'utf-8');
  compiledHtml = compiledHtml.replace(/href="\.\/assets\/manifest-[^"]+\.json"/g, 'href="./manifest.json"');
  compiledHtml = compiledHtml.replace(/href="\.\/assets\/icon-[^"]+\.png"/g, 'href="./icon.png"');
  fs.writeFileSync(distIndexPath, compiledHtml, 'utf-8');
}

// 2. Ensure manifest.json and all PWA icons/screenshots are present in both dist/ and rootDir
const pwaFiles = [
  'manifest.json',
  'icon.png',
  'icon-192.png',
  'icon-512.png',
  'screenshot-wide.png',
  'screenshot-narrow.png',
];
pwaFiles.forEach((f) => {
  const srcFile = path.resolve(rootDir, 'public', f);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.resolve(distDir, f));
    fs.copyFileSync(srcFile, path.resolve(rootDir, f));
  }
});

// 3. Read dist/assets to get all compiled files
const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];

// Base precache list
const precacheList = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
];

// Add all asset files (js, css, png, json)
assetFiles.forEach((file) => {
  if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.png') || file.endsWith('.json')) {
    precacheList.push(`./assets/${file}`);
  }
});

const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const cacheName = `visiontech-cache-v${timestamp}`;

console.log(`Generating Offline-First Sahel Service Worker with cache: ${cacheName}`);
console.log(`Pre-caching ${precacheList.length} assets:`, precacheList);

const swContent = `// VisionTech StockFlow - Service Worker 100% Offline-First (Spécial Sahel - Zéro Connexion Requise)
// Généré automatiquement lors de la compilation
const CACHE_NAME = '${cacheName}';

const PRECACHE_ASSETS = ${JSON.stringify(precacheList, null, 2)};

// Coquille HTML complète embarquée directement dans le Service Worker :
// Garantit à 100% que l'application s'ouvre instantanément sans connexion, même si le cache navigateur a été vidé !
const FALLBACK_HTML = ${JSON.stringify(compiledHtml)};

// 1. Installation immédiate : téléchargement et mise en cache de TOUS les fichiers de l'application
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Mise en cache complète de l\\'application pour fonctionnement 100% hors-ligne...');
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
`;

// Write to dist/sw.js, public/sw.js and root sw.js
fs.writeFileSync(path.resolve(distDir, 'sw.js'), swContent, 'utf-8');
fs.writeFileSync(path.resolve(rootDir, 'public', 'sw.js'), swContent, 'utf-8');
fs.writeFileSync(path.resolve(rootDir, 'sw.js'), swContent, 'utf-8');

console.log('✓ Service Worker Offline-First Sahel et Manifest PWA générés avec succès dans dist/, public/ et racine !');
