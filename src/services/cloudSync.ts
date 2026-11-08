import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { AppUser, Product, StockMovement, Expense, PurchaseBatch, VisitorSurvey } from '../types';
import {
  addCommandeOffline,
  getPendingCommandesOffline,
  clearCommandesOffline,
  synchroniserCatalogue,
} from './localDb';

export interface CloudStoreData {
  appUsers?: AppUser[];
  products?: Product[];
  movements?: StockMovement[];
  expenses?: Expense[];
  purchases?: PurchaseBatch[];
  surveys?: VisitorSurvey[];
  cashierPin?: string;
  cashierName?: string;
  storeName?: string;
  updatedAt?: string;
  lastDeviceId?: string;
}

export type CloudSyncStatus = 'connecting' | 'connected' | 'offline' | 'error';

// Configuration Firebase Cloud Firestore (Projet réel gestion-de-stock-c36d1)
export const CLOUD_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBb-wxxD_oga11Jj8eM6lrw7K3n7p4MwAQ',
  authDomain: 'gestion-de-stock-c36d1.firebaseapp.com',
  projectId: 'gestion-de-stock-c36d1',
  storageBucket: 'gestion-de-stock-c36d1.firebasestorage.app',
  messagingSenderId: '715879939275',
  appId: '1:715879939275:web:cd513174f4624d0dc66f4e',
};

const APP_NAME = 'visiontech-cloud-store';
const STORE_DOC_ID = 'visiontech-main';
const CLOUD_CREDENTIALS = {
  email: 'admin@boutiquevisiontech.bf',
  password: 'admin1234',
};

const OFFLINE_QUEUE_KEY = 'stockflow_offline_sync_queue_v2';
const OFFLINE_OPS_COUNT_KEY = 'stockflow_offline_ops_count_v1';

// Singleton instances
let cloudApp: FirebaseApp | null = null;
let cloudAuth: Auth | null = null;
let cloudDb: Firestore | null = null;

function getCloudServices() {
  if (!cloudApp) {
    const existing = getApps().find((a) => a.name === APP_NAME);
    cloudApp = existing || initializeApp(CLOUD_FIREBASE_CONFIG, APP_NAME);
    cloudAuth = getAuth(cloudApp);
    try {
      // Activer le cache persistant IndexedDB natif de Firestore pour le mode Sahel Hors-Ligne
      cloudDb = initializeFirestore(cloudApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      cloudDb = getFirestore(cloudApp);
    }
  }
  return { auth: cloudAuth!, db: cloudDb! };
}

// Generate or retrieve persistent local device ID
const DEVICE_ID_KEY = 'stockflow_device_uuid_v1';
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return 'dev-unknown';
  }
}

// Offline Queue Management
export function getOfflineQueue(): Partial<CloudStoreData> | null {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getPendingOfflineCount(): number {
  try {
    const c = Number(localStorage.getItem(OFFLINE_OPS_COUNT_KEY) || 0);
    if (c > 0) return c;
    return hasPendingOfflineData() ? 1 : 0;
  } catch (e) {
    return 0;
  }
}

export function saveOfflineQueue(data: Partial<CloudStoreData>) {
  try {
    const current = getOfflineQueue() || {};
    const merged = { ...current, ...data };
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(merged));
    const prevCount = Number(localStorage.getItem(OFFLINE_OPS_COUNT_KEY) || 0);
    localStorage.setItem(OFFLINE_OPS_COUNT_KEY, String(prevCount + 1));
  } catch (e) {}
  // Enregistre également dans la table Dexie VisionTechOfflineDB.commandesOffline
  addCommandeOffline(data);
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    localStorage.removeItem(OFFLINE_OPS_COUNT_KEY);
  } catch (e) {}
  clearCommandesOffline();
}

export function hasPendingOfflineData(): boolean {
  const q = getOfflineQueue();
  return q !== null && Object.keys(q).length > 0;
}

// Helper timeout pour éviter les blocages infinis sur réseau 2G/Edge Sahel
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackMsg = 'Network timeout'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error(fallbackMsg)), ms);
    promise
      .then((res) => {
        clearTimeout(tid);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(tid);
        reject(err);
      });
  });
}

// Ensure background session authentication for Firestore security rules (with singleton lock & timeout)
let authPromise: Promise<void> | null = null;

async function ensureCloudAuth(auth: Auth): Promise<void> {
  if (auth.currentUser) return;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      await withTimeout(
        signInWithEmailAndPassword(auth, CLOUD_CREDENTIALS.email, CLOUD_CREDENTIALS.password),
        7000,
        'Auth timeout (Sahel 2G)'
      );
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await withTimeout(
            createUserWithEmailAndPassword(auth, CLOUD_CREDENTIALS.email, CLOUD_CREDENTIALS.password),
            7000,
            'Create Auth timeout'
          );
        } catch (createErr) {
          console.warn('Cloud Auth create fallback warning:', createErr);
        }
      } else {
        console.warn('Cloud Auth sign-in warning (mode hors-ligne actif):', err?.message || err);
      }
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

// Active sync callbacks holder
let activeCallbacks: {
  onRemoteData: (data: CloudStoreData) => void;
  onStatusChange: (status: CloudSyncStatus, details?: string) => void;
} | null = null;

/**
 * Fusionne la file d'attente hors-ligne locale par-dessus les données distantes
 * pour garantir que les saisies faites sans connexion dans le Sahel ne soient JAMAIS écrasées.
 */
function mergeOfflineQueueOverRemote(remote: CloudStoreData): CloudStoreData {
  const queue = getOfflineQueue();
  if (!queue || Object.keys(queue).length === 0) return remote;

  const merged: CloudStoreData = { ...remote };

  // Fusionner les produits : les produits créés ou modifiés hors-ligne l'emportent toujours
  if (Array.isArray(queue.products) && queue.products.length > 0) {
    const prodMap = new Map<string, Product>();
    (remote.products || []).forEach((p) => prodMap.set(p.id, p));
    queue.products.forEach((qp) => {
      const existing = prodMap.get(qp.id);
      if (!existing) {
        prodMap.set(qp.id, qp);
      } else {
        const qTime = new Date(qp.lastUpdated || 0).getTime();
        const rTime = new Date(existing.lastUpdated || 0).getTime();
        if (qTime >= rTime) {
          prodMap.set(qp.id, qp);
        }
      }
    });
    merged.products = Array.from(prodMap.values());
  }

  // Fusionner les mouvements : conserver tous les mouvements créés hors-ligne
  if (Array.isArray(queue.movements) && queue.movements.length > 0) {
    const movMap = new Map<string, StockMovement>();
    (remote.movements || []).forEach((m) => movMap.set(m.id, m));
    queue.movements.forEach((qm) => movMap.set(qm.id, qm));
    merged.movements = Array.from(movMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  if (Array.isArray(queue.expenses) && queue.expenses.length > 0) {
    const expMap = new Map<string, Expense>();
    (remote.expenses || []).forEach((e) => expMap.set(e.id, e));
    queue.expenses.forEach((qe) => expMap.set(qe.id, qe));
    merged.expenses = Array.from(expMap.values());
  }

  if (Array.isArray(queue.purchases) && queue.purchases.length > 0) {
    const purMap = new Map<string, PurchaseBatch>();
    (remote.purchases || []).forEach((p) => purMap.set(p.id, p));
    queue.purchases.forEach((qp) => purMap.set(qp.id, qp));
    merged.purchases = Array.from(purMap.values());
  }

  if (Array.isArray(queue.surveys) && queue.surveys.length > 0) {
    const surMap = new Map<string, VisitorSurvey>();
    (remote.surveys || []).forEach((s) => surMap.set(s.id, s));
    queue.surveys.forEach((qs) => surMap.set(qs.id, qs));
    merged.surveys = Array.from(surMap.values());
  }

  if (Array.isArray(queue.appUsers) && queue.appUsers.length > 0) {
    merged.appUsers = queue.appUsers;
  }

  return merged;
}

/**
 * Initialise la synchronisation en temps réel avec le Cloud Firestore.
 * Détecte les passages en ligne et hors-ligne pour basculer automatiquement.
 */
export function initCloudSync(callbacks: {
  onRemoteData: (data: CloudStoreData) => void;
  onStatusChange: (status: CloudSyncStatus, details?: string) => void;
}): () => void {
  activeCallbacks = callbacks;
  const { auth, db } = getCloudServices();
  let unsubSnapshot: Unsubscribe | null = null;
  let isCancelled = false;

  if (!navigator.onLine) {
    callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
  } else {
    callbacks.onStatusChange('connecting', 'Connexion au Cloud VisionTech...');
  }

  const startListening = async () => {
    if (!navigator.onLine) {
      callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
      return;
    }

    try {
      await ensureCloudAuth(auth);
      if (isCancelled) return;

      // PRIORITÉ ABSOLUE SAHEL : Si des données ont été saisies hors-ligne, les envoyer AVANT d'écouter le Cloud !
      if (hasPendingOfflineData()) {
        try {
          await flushOfflineQueue();
        } catch (e) {
          // Si le réseau est trop faible pour envoyer maintenant, on garde la file intacte
        }
      }

      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      const storeDocRef = doc(db, 'stores', STORE_DOC_ID);

      unsubSnapshot = onSnapshot(
        storeDocRef,
        (snap) => {
          if (isCancelled) return;
          if (snap.exists()) {
            const rawData = snap.data() as CloudStoreData;
            // Toujours protéger les opérations hors-ligne non encore envoyées
            const safeData = hasPendingOfflineData()
              ? mergeOfflineQueueOverRemote(rawData)
              : rawData;
            callbacks.onStatusChange('connected', 'Connecté au Cloud (Temps Réel)');
            callbacks.onRemoteData(safeData);

            // Si des opérations hors-ligne étaient en attente et que la connexion vient de passer, les pousser
            if (hasPendingOfflineData()) {
              flushOfflineQueue().catch(() => {});
            }
          } else {
            callbacks.onStatusChange('connected', 'Prêt (Cloud initial)');
          }
        },
        (error) => {
          console.warn('Firestore snapshot warning (offline fallback):', error);
          if (!isCancelled) {
            callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
          }
        }
      );
    } catch (err: any) {
      console.warn('Mode Hors-Ligne actif (réseau Sahel indisponible):', err);
      if (!isCancelled) {
        callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
      }
    }
  };

  startListening();

  // Écoute automatique de la reconnexion Internet (Smartphone & Ordinateur)
  const handleOnline = async () => {
    callbacks.onStatusChange(
      'connecting',
      'Connexion Internet détectée ! Envoi automatique des saisies hors-ligne...'
    );
    try {
      await flushOfflineQueue();
      if (!unsubSnapshot) {
        await startListening();
      }
      callbacks.onStatusChange('connected', 'Données hors-ligne synchronisées avec succès !');
    } catch (err) {
      callbacks.onStatusChange('offline', 'En attente d’un signal réseau stable...');
    }
  };

  const handleOffline = () => {
    callbacks.onStatusChange('offline', 'Mode Hors-Ligne : Données sauvegardées sur l’appareil');
  };

  // Écoute des événements Service Worker Background Sync
  const handleSwMessage = (event: MessageEvent) => {
    if (event.data && event.data.action === 'TRIGGER_CLOUD_SYNC' && navigator.onLine) {
      flushOfflineQueue().catch(() => {});
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
  }

  // Vérification automatique toutes les 10 secondes (idéal pour les connexions intermittentes du Sahel)
  const retryInterval = setInterval(() => {
    if (navigator.onLine && hasPendingOfflineData()) {
      flushOfflineQueue().catch(() => {});
    }
  }, 10000);

  return () => {
    isCancelled = true;
    activeCallbacks = null;
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
    clearInterval(retryInterval);
    if (unsubSnapshot) {
      unsubSnapshot();
    }
  };
}

/**
 * Vide la file d'attente hors-ligne et pousse tout vers Firestore en fusionnant intelligemment.
 */
export async function flushOfflineQueue(): Promise<void> {
  let queue = getOfflineQueue();
  if (!queue || Object.keys(queue).length === 0) {
    const dexieRows = await getPendingCommandesOffline();
    if (dexieRows.length > 0) {
      queue = dexieRows.reduce<Partial<CloudStoreData>>((acc, row) => {
        if (row.details && typeof row.details === 'object') {
          return { ...acc, ...(row.details as Partial<CloudStoreData>) };
        }
        return acc;
      }, {});
    }
  }
  if (!queue || Object.keys(queue).length === 0) {
    return;
  }

  try {
    const { auth, db } = getCloudServices();
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', STORE_DOC_ID);

    // Lire l'état distant actuel (avec timeout court) pour fusionner sans écraser les autres appareils
    let mergedPayload: Partial<CloudStoreData> = { ...queue };
    try {
      const remoteSnap = await withTimeout(getDoc(storeDocRef), 6000, 'getDoc timeout');
      if (remoteSnap.exists()) {
        const remoteData = remoteSnap.data() as CloudStoreData;
        mergedPayload = mergeOfflineQueueOverRemote(remoteData);
      }
    } catch (e) {
      // Si la lecture préalable expire mais que l'écriture peut passer, on envoie directement queue
    }

    const deviceId = getDeviceId();
    const dataToSave = {
      ...mergedPayload,
      lastDeviceId: deviceId,
      updatedAt: new Date().toISOString(),
    };

    await withTimeout(setDoc(storeDocRef, dataToSave, { merge: true }), 8000, 'setDoc timeout');
    clearOfflineQueue();

    if (activeCallbacks) {
      activeCallbacks.onStatusChange('connected', 'Connecté au Cloud (Synchronisé)');
      activeCallbacks.onRemoteData(dataToSave);
    }
  } catch (err) {
    console.warn('flushOfflineQueue reporté (réseau Sahel trop faible, données conservées en local):', err);
    throw err;
  }
}

// Debounce helper for cloud push
let pendingPushData: Partial<CloudStoreData> = {};
let pushTimer: any = null;

/**
 * Envoie les données modifiées au Cloud Firestore.
 * Si l'appareil est hors-ligne ou sur un réseau Sahel très faible, les données sont immédiatement
 * stockées dans la file locale persistante et seront envoyées automatiquement dès que le réseau répond.
 */
export async function pushToCloud(partialData: Partial<CloudStoreData>): Promise<void> {
  const deviceId = getDeviceId();
  const timestamp = new Date().toISOString();

  // 1. Toujours enregistrer IMMÉDIATEMENT (0 ms) dans la file locale hors-ligne (localStorage + IndexedDB Dexie)
  saveOfflineQueue({
    ...partialData,
    lastDeviceId: deviceId,
    updatedAt: timestamp,
  });

  pendingPushData = {
    ...pendingPushData,
    ...partialData,
    lastDeviceId: deviceId,
    updatedAt: timestamp,
  };

  // Demander au Service Worker une synchronisation en arrière-plan dès que possible
  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then((reg: any) => {
        if (reg && reg.sync && typeof reg.sync.register === 'function') {
          reg.sync.register('visiontech-sync').catch(() => {});
        }
      })
      .catch(() => {});
  }

  // 2. Si hors-ligne, informer l'utilisateur sans aucune erreur ni attente
  if (!navigator.onLine) {
    if (activeCallbacks) {
      activeCallbacks.onStatusChange(
        'offline',
        'Mode Hors-Ligne : Saisie enregistrée sur l’appareil (envoi auto dès le retour du réseau)'
      );
    }
    return;
  }

  if (pushTimer) clearTimeout(pushTimer);

  return new Promise((resolve) => {
    pushTimer = setTimeout(async () => {
      const dataToSave = { ...getOfflineQueue(), ...pendingPushData };
      pendingPushData = {};
      try {
        const { auth, db } = getCloudServices();
        await ensureCloudAuth(auth);
        const storeDocRef = doc(db, 'stores', STORE_DOC_ID);
        await withTimeout(setDoc(storeDocRef, dataToSave, { merge: true }), 8000, 'Push timeout');
        clearOfflineQueue();
        if (activeCallbacks) {
          activeCallbacks.onStatusChange('connected', 'Connecté au Cloud (En direct)');
        }
        resolve();
      } catch (err) {
        console.warn('Cloud sync push warning (conservé dans la file hors-ligne pour le prochain réseau):', err);
        if (activeCallbacks) {
          activeCallbacks.onStatusChange(
            'offline',
            'Saisie enregistrée hors-ligne (en attente de réseau stable)'
          );
        }
        resolve();
      }
    }, 150);
  });
}

/**
 * Envoi immédiat forcé sans aucun délai de temporisation (debounce bypass).
 */
export async function forcePushToCloud(partialData: Partial<CloudStoreData>): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const deviceId = getDeviceId();
  const dataToSave = {
    ...getOfflineQueue(),
    ...pendingPushData,
    ...partialData,
    lastDeviceId: deviceId,
    updatedAt: new Date().toISOString(),
  };
  pendingPushData = {};
  saveOfflineQueue(dataToSave);

  if (!navigator.onLine) {
    if (activeCallbacks) {
      activeCallbacks.onStatusChange(
        'offline',
        'Mode Hors-Ligne : Données enregistrées sur l’appareil (synchronisation auto au retour du réseau)'
      );
    }
    return;
  }

  try {
    const { auth, db } = getCloudServices();
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', STORE_DOC_ID);
    await withTimeout(setDoc(storeDocRef, dataToSave, { merge: true }), 8000, 'ForcePush timeout');
    clearOfflineQueue();
    if (activeCallbacks) {
      activeCallbacks.onStatusChange('connected', 'Connecté au Cloud (En direct)');
    }
  } catch (err) {
    console.warn('forcePushToCloud offline warning:', err);
    if (activeCallbacks) {
      activeCallbacks.onStatusChange('offline', 'Données sécurisées localement (en attente de réseau)');
    }
  }
}

/**
 * Récupère directement l'état le plus frais depuis le Cloud Firestore.
 */
export async function pullFromCloud(): Promise<CloudStoreData | null> {
  if (!navigator.onLine) {
    return null;
  }
  try {
    const { auth, db } = getCloudServices();
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', STORE_DOC_ID);
    const snap = await withTimeout(getDoc(storeDocRef), 8000, 'pullFromCloud timeout');
    if (snap.exists()) {
      const data = snap.data() as CloudStoreData;
      if (data.products && data.products.length > 0) {
        synchroniserCatalogue(async () => data.products || null).catch(() => {});
      }
      return data;
    }
    return null;
  } catch (err) {
    console.error('pullFromCloud error:', err);
    throw err;
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).synchroniserCatalogue = (apiUrl?: string) =>
    synchroniserCatalogue(
      apiUrl ||
        (async () => {
          const remote = await pullFromCloud();
          return remote?.products || null;
        })
    );
}
