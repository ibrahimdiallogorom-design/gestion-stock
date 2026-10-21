import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { AppUser, Product, StockMovement, Expense, PurchaseBatch, VisitorSurvey } from '../types';

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

// Singleton instances
let cloudApp: FirebaseApp | null = null;
let cloudAuth: Auth | null = null;
let cloudDb: Firestore | null = null;

function getCloudServices() {
  if (!cloudApp) {
    const existing = getApps().find((a) => a.name === APP_NAME);
    cloudApp = existing || initializeApp(CLOUD_FIREBASE_CONFIG, APP_NAME);
    cloudAuth = getAuth(cloudApp);
    cloudDb = getFirestore(cloudApp);
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

export function saveOfflineQueue(data: Partial<CloudStoreData>) {
  try {
    const current = getOfflineQueue() || {};
    const merged = { ...current, ...data };
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(merged));
  } catch (e) {}
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (e) {}
}

export function hasPendingOfflineData(): boolean {
  const q = getOfflineQueue();
  return q !== null && Object.keys(q).length > 0;
}

// Ensure background session authentication for Firestore security rules (with singleton lock)
let authPromise: Promise<void> | null = null;

async function ensureCloudAuth(auth: Auth): Promise<void> {
  if (auth.currentUser) return;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        CLOUD_CREDENTIALS.email,
        CLOUD_CREDENTIALS.password
      );
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(
            auth,
            CLOUD_CREDENTIALS.email,
            CLOUD_CREDENTIALS.password
          );
        } catch (createErr) {
          console.warn('Cloud Auth create fallback warning:', createErr);
        }
      } else {
        console.warn('Cloud Auth sign-in warning:', err);
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

  // Initial check
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

      const storeDocRef = doc(db, 'stores', STORE_DOC_ID);

      unsubSnapshot = onSnapshot(
        storeDocRef,
        (snap) => {
          if (isCancelled) return;
          if (snap.exists()) {
            const data = snap.data() as CloudStoreData;
            callbacks.onStatusChange('connected', 'Connecté au Cloud (Temps Réel)');
            callbacks.onRemoteData(data);
          } else {
            callbacks.onStatusChange('connected', 'Prêt (Cloud initial)');
          }
        },
        (error) => {
          console.warn('Firestore snapshot error:', error);
          if (!isCancelled) {
            callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
          }
        }
      );

      // Si des données hors-ligne étaient en attente, les vider maintenant
      if (hasPendingOfflineData()) {
        flushOfflineQueue().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Failed to start Cloud sync:', err);
      if (!isCancelled) {
        callbacks.onStatusChange('offline', 'Connexion Cloud indisponible (Local)');
      }
    }
  };

  startListening();

  // Écoute automatique de la reconnexion Internet (Smartphone & Ordinateur)
  const handleOnline = async () => {
    callbacks.onStatusChange('connecting', 'Connexion Internet rétablie ! Synchronisation avec le Cloud...');
    try {
      await flushOfflineQueue();
      if (!unsubSnapshot) {
        startListening();
      }
      callbacks.onStatusChange('connected', 'Données synchronisées avec succès !');
    } catch (err) {
      callbacks.onStatusChange('offline', 'Reconnexion en attente...');
    }
  };

  const handleOffline = () => {
    callbacks.onStatusChange('offline', 'Mode Hors-Ligne : Données sauvegardées localement');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Vérification périodique toutes les 25 secondes si des données locales restent à envoyer
  const retryInterval = setInterval(() => {
    if (navigator.onLine && hasPendingOfflineData()) {
      flushOfflineQueue().catch(() => {});
    }
  }, 25000);

  return () => {
    isCancelled = true;
    activeCallbacks = null;
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(retryInterval);
    if (unsubSnapshot) {
      unsubSnapshot();
    }
  };
}

/**
 * Vide la file d'attente hors-ligne et pousse tout vers Firestore.
 * Récupère également les dernières données distantes.
 */
export async function flushOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue();
  if (!queue || Object.keys(queue).length === 0) {
    // Si pas de données à envoyer, on tire simplement les données fraîches
    try {
      const remote = await pullFromCloud();
      if (remote && activeCallbacks) {
        activeCallbacks.onRemoteData(remote);
      }
    } catch (e) {}
    return;
  }

  const deviceId = getDeviceId();
  const dataToSave = {
    ...queue,
    lastDeviceId: deviceId,
    updatedAt: new Date().toISOString(),
  };

  try {
    const { auth, db } = getCloudServices();
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', STORE_DOC_ID);
    await setDoc(storeDocRef, dataToSave, { merge: true });
    clearOfflineQueue();

    // Pull remote update to merge
    const remote = await pullFromCloud();
    if (remote && activeCallbacks) {
      activeCallbacks.onRemoteData(remote);
    }
  } catch (err) {
    console.warn('flushOfflineQueue failed, will retry upon next connection:', err);
    throw err;
  }
}

// Debounce helper for cloud push
let pendingPushData: Partial<CloudStoreData> = {};
let pushTimer: any = null;

/**
 * Envoie les données modifiées au Cloud Firestore.
 * Si l'appareil est hors-ligne, les données sont immédiatement stockées
 * dans la file locale persistante et seront envoyées automatiquement dès la reconnexion.
 */
export async function pushToCloud(partialData: Partial<CloudStoreData>): Promise<void> {
  const deviceId = getDeviceId();
  const timestamp = new Date().toISOString();

  // 1. Toujours enregistrer immédiatement dans la file locale hors-ligne
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

  // 2. Si hors-ligne, informer l'utilisateur sans erreur bloquante
  if (!navigator.onLine) {
    if (activeCallbacks) {
      activeCallbacks.onStatusChange(
        'offline',
        'Mode Hors-Ligne : Données enregistrées localement (synchronisation auto au retour du réseau)'
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
        await setDoc(storeDocRef, dataToSave, { merge: true });
        clearOfflineQueue();
        if (activeCallbacks) {
          activeCallbacks.onStatusChange('connected', 'Connecté au Cloud (En direct)');
        }
        resolve();
      } catch (err) {
        console.warn('Cloud sync push warning (stored in offline queue for next connection):', err);
        if (activeCallbacks) {
          activeCallbacks.onStatusChange(
            'offline',
            'Enregistré hors-ligne (en attente de réseau)'
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
        'Mode Hors-Ligne : Données enregistrées localement (synchronisation auto au retour du réseau)'
      );
    }
    return;
  }

  try {
    const { auth, db } = getCloudServices();
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', STORE_DOC_ID);
    await setDoc(storeDocRef, dataToSave, { merge: true });
    clearOfflineQueue();
    if (activeCallbacks) {
      activeCallbacks.onStatusChange('connected', 'Connecté au Cloud (En direct)');
    }
  } catch (err) {
    console.warn('forcePushToCloud offline warning:', err);
    if (activeCallbacks) {
      activeCallbacks.onStatusChange('offline', 'Données sécurisées localement');
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
    const snap = await getDoc(storeDocRef);
    if (snap.exists()) {
      return snap.data() as CloudStoreData;
    }
    return null;
  } catch (err) {
    console.error('pullFromCloud error:', err);
    throw err;
  }
}
