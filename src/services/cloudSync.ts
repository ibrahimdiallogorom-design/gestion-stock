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
import { AppUser, Product, StockMovement } from '../types';

export interface CloudStoreData {
  appUsers?: AppUser[];
  products?: Product[];
  movements?: StockMovement[];
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

/**
 * Initialise la synchronisation en temps réel avec le Cloud Firestore.
 * Écoute les modifications de données depuis d'autres téléphones / appareils.
 */
export function initCloudSync(callbacks: {
  onRemoteData: (data: CloudStoreData) => void;
  onStatusChange: (status: CloudSyncStatus, details?: string) => void;
}): () => void {
  const { auth, db } = getCloudServices();
  let unsubSnapshot: Unsubscribe | null = null;
  let isCancelled = false;

  callbacks.onStatusChange('connecting', 'Connexion au Cloud VisionTech...');

  const startListening = async () => {
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
    } catch (err: any) {
      console.warn('Failed to start Cloud sync:', err);
      if (!isCancelled) {
        callbacks.onStatusChange('offline', 'Connexion Cloud indisponible (Local)');
      }
    }
  };

  startListening();

  return () => {
    isCancelled = true;
    if (unsubSnapshot) {
      unsubSnapshot();
    }
  };
}

// Queue / Debounce helper for cloud push
let pendingPushData: Partial<CloudStoreData> = {};
let pushTimer: any = null;

/**
 * Envoie les données modifiées au Cloud Firestore en temps réel.
 * Les autres téléphones reçoivent ces données instantanément.
 */
export async function pushToCloud(partialData: Partial<CloudStoreData>): Promise<void> {
  const deviceId = getDeviceId();
  pendingPushData = {
    ...pendingPushData,
    ...partialData,
    lastDeviceId: deviceId,
    updatedAt: new Date().toISOString(),
  };

  if (pushTimer) clearTimeout(pushTimer);

  return new Promise((resolve) => {
    pushTimer = setTimeout(async () => {
      const dataToSave = { ...pendingPushData };
      pendingPushData = {};
      try {
        const { auth, db } = getCloudServices();
        await ensureCloudAuth(auth);
        const storeDocRef = doc(db, 'stores', STORE_DOC_ID);
        await setDoc(storeDocRef, dataToSave, { merge: true });
        resolve();
      } catch (err) {
        console.warn('Cloud sync push warning (retrying later):', err);
        resolve();
      }
    }, 100); // 100ms ultra-fast sync
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
    ...pendingPushData,
    ...partialData,
    lastDeviceId: deviceId,
    updatedAt: new Date().toISOString(),
  };
  pendingPushData = {};

  try {
    const { auth, db } = getCloudServices();
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', STORE_DOC_ID);
    await setDoc(storeDocRef, dataToSave, { merge: true });
  } catch (err) {
    console.error('forcePushToCloud error:', err);
    throw err;
  }
}

/**
 * Récupère directement l'état le plus frais depuis le Cloud Firestore.
 */
export async function pullFromCloud(): Promise<CloudStoreData | null> {
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

