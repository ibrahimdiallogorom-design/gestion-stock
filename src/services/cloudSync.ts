import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  enableNetwork,
  doc,
  getDoc,
  getDocFromServer,
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
const DEFAULT_STORE_DOC_ID = 'visiontech-main';
const SAAS_TENANT_STORAGE_KEY = 'stockflow_saas_tenant_id_v1';

/**
 * Récupère l'identifiant d'espace entreprise (Tenant SaaS).
 * Par défaut : 'visiontech-main' pour préserver 100% des données actuelles.
 */
export function getActiveTenantId(): string {
  try {
    const saved = localStorage.getItem(SAAS_TENANT_STORAGE_KEY);
    if (saved && saved.trim().length >= 3) {
      return saved.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    }
  } catch (e) {}
  return DEFAULT_STORE_DOC_ID;
}

export function setActiveTenantId(tenantId: string): string {
  const clean =
    (tenantId || DEFAULT_STORE_DOC_ID)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') || DEFAULT_STORE_DOC_ID;
  try {
    localStorage.setItem(SAAS_TENANT_STORAGE_KEY, clean);
  } catch (e) {}
  return clean;
}

/**
 * Génère un code d'espace SaaS unique avec suffixe aléatoire anti-énumération (contre les scans).
 */
export function generateSaaSTenantId(companyName: string): string {
  const slug =
    companyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 18) || 'boutique';
  const randomBytes = new Uint8Array(4);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 4; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${slug}-${hex}`;
}

const CLOUD_CREDENTIALS = {
  email: 'admin@boutiquevisiontech.bf',
  password: 'admin1234',
};

const OFFLINE_QUEUE_KEY = 'stockflow_offline_sync_queue_v2';
const OFFLINE_OPS_COUNT_KEY = 'stockflow_offline_ops_count_v1';
const OFFLINE_DIRTY_META_KEY = 'stockflow_offline_dirty_meta_v1';

// Clés localStorage principales de StockContext (utilisées en secours si OFFLINE_QUEUE_KEY dépasse le quota de 5 Mo)
const LOCAL_STORAGE_KEYS = {
  PRODUCTS: 'stockflow_products_v1',
  MOVEMENTS: 'stockflow_movements_v1',
  APP_USERS: 'stockflow_app_users_v2',
  EXPENSES: 'stockflow_expenses_v1',
  PURCHASES: 'stockflow_purchases_v1',
  SURVEYS: 'stockflow_surveys_v1',
  CASHIER_PIN: 'stockflow_cashier_pin_v1',
  CASHIER_NAME: 'stockflow_cashier_name_v1',
};

export interface OfflineDirtyMeta {
  products?: boolean;
  movements?: boolean;
  expenses?: boolean;
  purchases?: boolean;
  surveys?: boolean;
  appUsers?: boolean;
  cashierPin?: boolean;
  cashierName?: boolean;
  dirtyProductIds?: Record<string, string>;
  dirtyMovementIds?: Record<string, boolean>;
  updatedAt: string;
}

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

/**
 * Normalise un timestamp ISO pour éviter qu'une horloge future simulée (ex: 2026-10 ou 2026-11)
 * n'écrase les ventes et modifications faites à la date réelle de l'appareil.
 */
export function normalizeTimestamp(iso?: string): number {
  if (!iso) return 0;
  const baseline = new Date('2026-01-01T00:00:00.000Z').getTime();
  if (iso.startsWith('2026-10-') || iso.startsWith('2026-11-') || iso.startsWith('2026-12-')) {
    return baseline;
  }
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t) || t <= 0) return 0;
  const now = Date.now();
  // Si le timestamp stocké est dans le futur par rapport à l'horloge réelle de l'appareil (+5 min de tolérance)
  if (t > now + 5 * 60 * 1000) {
    return baseline;
  }
  return t;
}

export function getOfflineDirtyMeta(): OfflineDirtyMeta | null {
  try {
    const raw = localStorage.getItem(OFFLINE_DIRTY_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Nettoie récursivement toutes les propriétés `undefined` avant écriture dans Firestore.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

/**
 * Récupère la file d'attente hors-ligne complète.
 * Même si `OFFLINE_QUEUE_KEY` a été limité par la taille des photos en localStorage,
 * reconstruit intégralement les données modifiées hors-ligne depuis `OFFLINE_DIRTY_META_KEY` et les clés locales.
 */
export function getOfflineQueue(): Partial<CloudStoreData> | null {
  let queue: Partial<CloudStoreData> = {};
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) {
      queue = JSON.parse(raw) || {};
    }
  } catch (e) {}

  const meta = getOfflineDirtyMeta();
  if (meta) {
    try {
      if (meta.products && (!Array.isArray(queue.products) || queue.products.length === 0)) {
        const pRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS);
        if (pRaw) queue.products = JSON.parse(pRaw);
      } else if (meta.products) {
        // Toujours prendre la version la plus fraîche de localStorage pour les produits modifiés hors-ligne
        const pRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS);
        if (pRaw) {
          const latestLocalProds: Product[] = JSON.parse(pRaw);
          if (Array.isArray(latestLocalProds) && latestLocalProds.length > 0) {
            queue.products = latestLocalProds;
          }
        }
      }
      if (meta.movements) {
        const mRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.MOVEMENTS);
        if (mRaw) {
          const latestLocalMovs: StockMovement[] = JSON.parse(mRaw);
          if (Array.isArray(latestLocalMovs)) {
            const movMap = new Map<string, StockMovement>();
            (queue.movements || []).forEach((m) => movMap.set(m.id, m));
            latestLocalMovs.forEach((m) => movMap.set(m.id, m));
            queue.movements = Array.from(movMap.values());
          }
        }
      }
      if (meta.expenses) {
        const eRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.EXPENSES);
        if (eRaw) queue.expenses = JSON.parse(eRaw);
      }
      if (meta.purchases) {
        const purRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.PURCHASES);
        if (purRaw) queue.purchases = JSON.parse(purRaw);
      }
      if (meta.surveys) {
        const sRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.SURVEYS);
        if (sRaw) queue.surveys = JSON.parse(sRaw);
      }
      if (meta.appUsers) {
        const uRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.APP_USERS);
        if (uRaw) queue.appUsers = JSON.parse(uRaw);
      }
      if (meta.cashierPin) {
        const pin = localStorage.getItem(LOCAL_STORAGE_KEYS.CASHIER_PIN);
        if (pin) queue.cashierPin = pin;
      }
      if (meta.cashierName) {
        const name = localStorage.getItem(LOCAL_STORAGE_KEYS.CASHIER_NAME);
        if (name) queue.cashierName = name;
      }
      queue.updatedAt = meta.updatedAt || new Date().toISOString();
      queue.lastDeviceId = getDeviceId();
    } catch (e) {}
  }

  return Object.keys(queue).length > 0 ? queue : null;
}

export function hasPendingOfflineData(): boolean {
  try {
    const c = Number(localStorage.getItem(OFFLINE_OPS_COUNT_KEY) || 0);
    if (c > 0) return true;
    const meta = getOfflineDirtyMeta();
    if (meta && Object.keys(meta).length > 1) return true;
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw && raw.length > 2) return true;
  } catch (e) {}
  return false;
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
  const cleanData = sanitizeForFirestore(data);
  const now = new Date().toISOString();

  // 1. Enregistrer IMMÉDIATEMENT le compteur et les métadonnées légères (< 2 Ko, ne dépasse jamais le quota localStorage)
  try {
    const prevCount = Number(localStorage.getItem(OFFLINE_OPS_COUNT_KEY) || 0);
    localStorage.setItem(OFFLINE_OPS_COUNT_KEY, String(prevCount + 1));

    const prevMeta: OfflineDirtyMeta = getOfflineDirtyMeta() || { updatedAt: now };
    const nextDirtyProds = { ...(prevMeta.dirtyProductIds || {}) };
    const nextDirtyMovs = { ...(prevMeta.dirtyMovementIds || {}) };

    if (Array.isArray(cleanData.products)) {
      prevMeta.products = true;
      cleanData.products.forEach((p) => {
        if (p && p.id) nextDirtyProds[p.id] = p.lastUpdated || now;
      });
    }
    if (Array.isArray(cleanData.movements)) {
      prevMeta.movements = true;
      cleanData.movements.slice(0, 50).forEach((m) => {
        if (m && m.id) nextDirtyMovs[m.id] = true;
      });
    }
    if (Array.isArray(cleanData.expenses)) prevMeta.expenses = true;
    if (Array.isArray(cleanData.purchases)) prevMeta.purchases = true;
    if (Array.isArray(cleanData.surveys)) prevMeta.surveys = true;
    if (Array.isArray(cleanData.appUsers)) prevMeta.appUsers = true;
    if (cleanData.cashierPin !== undefined) prevMeta.cashierPin = true;
    if (cleanData.cashierName !== undefined) prevMeta.cashierName = true;

    prevMeta.dirtyProductIds = nextDirtyProds;
    prevMeta.dirtyMovementIds = nextDirtyMovs;
    prevMeta.updatedAt = now;

    localStorage.setItem(OFFLINE_DIRTY_META_KEY, JSON.stringify(prevMeta));
  } catch (e) {}

  // 2. Sauvegarder le payload complet dans OFFLINE_QUEUE_KEY (si la taille localStorage le permet)
  try {
    const rawCurrent = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const current = rawCurrent ? JSON.parse(rawCurrent) : {};
    const merged = sanitizeForFirestore({ ...current, ...cleanData, updatedAt: now });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(merged));
  } catch (e) {
    // Si QuotaExceededError à cause des photos Base64, getOfflineQueue() lira directement stockflow_products_v1 + Dexie !
  }

  // 3. Enregistrer dans la table IndexedDB Dexie (capacité illimitée)
  addCommandeOffline(cleanData);
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    localStorage.removeItem(OFFLINE_OPS_COUNT_KEY);
    localStorage.removeItem(OFFLINE_DIRTY_META_KEY);
  } catch (e) {}
  clearCommandesOffline();
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

// Ensure background session authentication for Firestore security rules
let authPromise: Promise<void> | null = null;

async function ensureCloudAuth(auth: Auth): Promise<void> {
  if (auth.currentUser) return;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      // Restaurer la session Firebase Auth déjà mise en cache localement si disponible
      if (typeof (auth as any).authStateReady === 'function') {
        await withTimeout((auth as any).authStateReady(), 2500, 'authStateReady timeout').catch(() => {});
      }
      if (auth.currentUser) return;

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

  await authPromise;
  if (!auth.currentUser) {
    throw new Error('Authentification Cloud indisponible hors connexion.');
  }
}

// Active sync callbacks holder
let activeCallbacks: {
  onRemoteData: (data: CloudStoreData) => void;
  onStatusChange: (status: CloudSyncStatus, details?: string) => void;
} | null = null;

/**
 * Fusionne la file d'attente hors-ligne locale par-dessus les données distantes
 * pour garantir que les ventes et saisies faites sans connexion ne soient JAMAIS écrasées.
 */
export function mergeOfflineQueueOverRemote(
  remote: CloudStoreData,
  explicitQueue?: Partial<CloudStoreData> | null
): CloudStoreData {
  const queue = explicitQueue || getOfflineQueue();
  if (!queue || Object.keys(queue).length === 0) return remote;

  const dirtyMeta = getOfflineDirtyMeta();
  const dirtyProdIds = dirtyMeta?.dirtyProductIds || {};
  const merged: CloudStoreData = { ...remote };

  // Identifier les mouvements créés hors-ligne qui ne sont pas encore sur le serveur
  const remoteMovIds = new Set((remote.movements || []).map((m) => m.id));
  const newOfflineMovements = (queue.movements || []).filter((m) => m && m.id && !remoteMovIds.has(m.id));

  // 1. Fusionner les produits : les produits créés, vendus ou modifiés hors-ligne l'emportent toujours
  if (Array.isArray(queue.products) && queue.products.length > 0) {
    const prodMap = new Map<string, Product>();
    (remote.products || []).forEach((p) => prodMap.set(p.id, p));

    queue.products.forEach((qp) => {
      const existing = prodMap.get(qp.id);
      if (!existing) {
        prodMap.set(qp.id, qp);
      } else {
        const isDirtyOffline = Boolean(dirtyProdIds[qp.id]);
        const hasOfflineMovementForProduct = newOfflineMovements.some((m) => m.productId === qp.id);
        const qTime = normalizeTimestamp(qp.lastUpdated);
        const rTime = normalizeTimestamp(existing.lastUpdated);

        if (isDirtyOffline || hasOfflineMovementForProduct || qTime >= rTime) {
          prodMap.set(qp.id, qp);
        }
      }
    });
    merged.products = Array.from(prodMap.values());
  }

  // 2. Fusionner les mouvements : union complète (conserver 100% des ventes et mouvements hors-ligne + distants)
  if (Array.isArray(queue.movements) && queue.movements.length > 0) {
    const movMap = new Map<string, StockMovement>();
    (remote.movements || []).forEach((m) => {
      if (m && m.id) movMap.set(m.id, m);
    });
    queue.movements.forEach((qm) => {
      if (qm && qm.id) movMap.set(qm.id, qm);
    });
    merged.movements = Array.from(movMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  // 3. Fusionner les dépenses
  if (Array.isArray(queue.expenses) && queue.expenses.length > 0) {
    const expMap = new Map<string, Expense>();
    (remote.expenses || []).forEach((e) => {
      if (e && e.id) expMap.set(e.id, e);
    });
    queue.expenses.forEach((qe) => {
      if (qe && qe.id) expMap.set(qe.id, qe);
    });
    merged.expenses = Array.from(expMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  // 4. Fusionner les achats
  if (Array.isArray(queue.purchases) && queue.purchases.length > 0) {
    const purMap = new Map<string, PurchaseBatch>();
    (remote.purchases || []).forEach((p) => {
      if (p && p.id) purMap.set(p.id, p);
    });
    queue.purchases.forEach((qp) => {
      if (qp && qp.id) purMap.set(qp.id, qp);
    });
    merged.purchases = Array.from(purMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  // 5. Fusionner les sondages visiteurs
  if (Array.isArray(queue.surveys) && queue.surveys.length > 0) {
    const surMap = new Map<string, VisitorSurvey>();
    (remote.surveys || []).forEach((s) => {
      if (s && s.id) surMap.set(s.id, s);
    });
    queue.surveys.forEach((qs) => {
      if (qs && qs.id) surMap.set(qs.id, qs);
    });
    merged.surveys = Array.from(surMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  // 6. Comptes utilisateurs & paramètres caisse
  if (Array.isArray(queue.appUsers) && queue.appUsers.length > 0) {
    const userMap = new Map<string, AppUser>();
    (remote.appUsers || []).forEach((u) => {
      if (u && u.id) userMap.set(u.id, u);
    });
    queue.appUsers.forEach((qu) => {
      if (qu && qu.id) userMap.set(qu.id, qu);
    });
    merged.appUsers = Array.from(userMap.values());
  }

  if (queue.cashierPin !== undefined) merged.cashierPin = queue.cashierPin;
  if (queue.cashierName !== undefined) merged.cashierName = queue.cashierName;

  return merged;
}

// Mutex lock pour éviter que plusieurs flushOfflineQueue ne s'exécutent en parallèle
let activeFlushPromise: Promise<void> | null = null;

/**
 * Vide la file d'attente hors-ligne, télécharge l'état distant actuel, fusionne les deux
 * et pousse tout vers Firestore automatiquement.
 */
export async function flushOfflineQueue(): Promise<void> {
  if (activeFlushPromise) {
    return activeFlushPromise;
  }

  activeFlushPromise = (async () => {
    let queue = getOfflineQueue();
    const dexieRows = await getPendingCommandesOffline();
    if (dexieRows.length > 0) {
      const dexieMerged = dexieRows.reduce<Partial<CloudStoreData>>((acc, row) => {
        if (row.details && typeof row.details === 'object') {
          return { ...acc, ...(row.details as Partial<CloudStoreData>) };
        }
        return acc;
      }, {});
      queue = queue ? { ...dexieMerged, ...queue } : dexieMerged;
    }

    if (!queue || Object.keys(queue).length === 0) {
      return;
    }

    const { auth, db } = getCloudServices();
    await enableNetwork(db).catch(() => {});
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', getActiveTenantId());

    // 1. Télécharger l'état distant actuel depuis le serveur pour fusionner sans rien perdre
    let mergedPayload: CloudStoreData = { ...queue };
    try {
      const remoteSnap = await withTimeout(
        getDocFromServer(storeDocRef).catch(() => getDoc(storeDocRef)),
        7000,
        'getDoc timeout'
      );
      if (remoteSnap && remoteSnap.exists()) {
        const remoteData = remoteSnap.data() as CloudStoreData;
        mergedPayload = mergeOfflineQueueOverRemote(remoteData, queue);
      }
    } catch (e) {
      // Si la lecture préalable expire mais que l'écriture peut passer, on envoie queue fusionnée avec localStorage
      mergedPayload = mergeOfflineQueueOverRemote({}, queue);
    }

    const deviceId = getDeviceId();
    const dataToSave = sanitizeForFirestore({
      ...mergedPayload,
      lastDeviceId: deviceId,
      updatedAt: new Date().toISOString(),
    });

    // 2. Envoyer au Cloud Firestore
    await withTimeout(setDoc(storeDocRef, dataToSave, { merge: true }), 10000, 'setDoc timeout');

    // 3. Vider la file hors-ligne UNIQUEMENT après confirmation d'écriture par le serveur
    clearOfflineQueue();

    // 4. Mettre à jour immédiatement l'interface locale avec les données fusionnées (envoi + téléchargement)
    if (activeCallbacks) {
      activeCallbacks.onStatusChange(
        'connected',
        'Connecté au Cloud (Ventes & saisies hors-ligne synchronisées !)'
      );
      activeCallbacks.onRemoteData(dataToSave);
    }
  })();

  try {
    await activeFlushPromise;
  } finally {
    activeFlushPromise = null;
  }
}

/**
 * Initialise la synchronisation en temps réel avec le Cloud Firestore.
 * Détecte automatiquement le retour de la connexion (Wi-Fi, 3G/4G, focus onglet, heartbeat 6s)
 * pour envoyer les ventes hors-ligne et télécharger automatiquement les nouvelles données.
 */
export function initCloudSync(callbacks: {
  onRemoteData: (data: CloudStoreData) => void;
  onStatusChange: (status: CloudSyncStatus, details?: string) => void;
}): () => void {
  activeCallbacks = callbacks;
  const { auth, db } = getCloudServices();
  let unsubSnapshot: Unsubscribe | null = null;
  let isCancelled = false;
  let isSnapshotHealthy = false;
  let reconnectTimers: any[] = [];

  if (!navigator.onLine) {
    callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
  } else {
    callbacks.onStatusChange('connecting', 'Connexion au Cloud VisionTech...');
  }

  const startListening = async () => {
    if (isCancelled) return;
    if (!navigator.onLine) {
      isSnapshotHealthy = false;
      callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
      return;
    }

    try {
      await enableNetwork(db).catch(() => {});
      await ensureCloudAuth(auth);
      if (isCancelled) return;

      // 1. PRIORITÉ ABSOLUE : Si des ventes ou saisies ont été faites hors-ligne, les envoyer et fusionner d'abord !
      if (hasPendingOfflineData()) {
        try {
          await flushOfflineQueue();
        } catch (e) {
          // La file hors-ligne reste intacte pour la prochaine tentative automatique
        }
      }

      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      const storeDocRef = doc(db, 'stores', getActiveTenantId());

      // 2. Télécharger immédiatement la dernière version du serveur (getDocFromServer) lors de la (re)connexion
      try {
        const freshSnap = await withTimeout(
          getDocFromServer(storeDocRef).catch(() => getDoc(storeDocRef)),
          7000,
          'Initial pull timeout'
        );
        if (!isCancelled && freshSnap && freshSnap.exists()) {
          const rawData = freshSnap.data() as CloudStoreData;
          const safeData = hasPendingOfflineData()
            ? mergeOfflineQueueOverRemote(rawData)
            : rawData;
          callbacks.onStatusChange('connected', 'Connecté au Cloud (Temps Réel)');
          callbacks.onRemoteData(safeData);
        }
      } catch (pullErr) {
        // Ignore, onSnapshot prendra le relais
      }

      // 3. Écoute en temps réel continue
      unsubSnapshot = onSnapshot(
        storeDocRef,
        (snap) => {
          if (isCancelled) return;
          isSnapshotHealthy = true;
          if (snap.exists()) {
            const rawData = snap.data() as CloudStoreData;
            const safeData = hasPendingOfflineData()
              ? mergeOfflineQueueOverRemote(rawData)
              : rawData;
            callbacks.onStatusChange('connected', 'Connecté au Cloud (Temps Réel)');
            callbacks.onRemoteData(safeData);

            if (hasPendingOfflineData()) {
              flushOfflineQueue().catch(() => {});
            }
          } else {
            callbacks.onStatusChange('connected', 'Prêt (Cloud initial)');
          }
        },
        (error) => {
          console.warn('Firestore snapshot warning (offline fallback):', error);
          isSnapshotHealthy = false;
          if (unsubSnapshot) {
            unsubSnapshot();
            unsubSnapshot = null;
          }
          if (!isCancelled) {
            callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
          }
        }
      );
    } catch (err: any) {
      isSnapshotHealthy = false;
      if (!isCancelled) {
        callbacks.onStatusChange('offline', 'Mode Hors-Ligne (Stock local sécurisé)');
      }
    }
  };

  startListening();

  // Fonction centrale d'auto-synchronisation (Upload des ventes hors-ligne + Download du Cloud)
  const triggerAutoSyncNow = async (showConnectingBanner = false) => {
    if (isCancelled || !navigator.onLine) return;

    if (showConnectingBanner) {
      callbacks.onStatusChange(
        'connecting',
        hasPendingOfflineData()
          ? `Connexion détectée ! Envoi automatique de ${getPendingOfflineCount()} opération(s) hors-ligne...`
          : 'Connexion détectée ! Téléchargement automatique des données Cloud...'
      );
    }

    try {
      await enableNetwork(db).catch(() => {});
      if (hasPendingOfflineData()) {
        await flushOfflineQueue();
      }
      if (!unsubSnapshot || !isSnapshotHealthy) {
        await startListening();
      } else {
        // Même si l'écouteur était actif, forcer un téléchargement frais depuis le serveur au retour réseau
        const storeDocRef = doc(db, 'stores', getActiveTenantId());
        const snap = await withTimeout(
          getDocFromServer(storeDocRef).catch(() => getDoc(storeDocRef)),
          7000,
          'Auto-pull timeout'
        );
        if (!isCancelled && snap && snap.exists()) {
          const rawData = snap.data() as CloudStoreData;
          const safeData = hasPendingOfflineData()
            ? mergeOfflineQueueOverRemote(rawData)
            : rawData;
          callbacks.onRemoteData(safeData);
        }
      }
      if (!isCancelled && !hasPendingOfflineData()) {
        callbacks.onStatusChange('connected', 'Connecté au Cloud (Synchronisé automatiquement)');
      }
    } catch (err) {
      if (!isCancelled) {
        callbacks.onStatusChange(
          'offline',
          hasPendingOfflineData()
            ? `Hors-Ligne : ${getPendingOfflineCount()} opération(s) en attente d'envoi auto`
            : 'En attente d’un signal réseau stable...'
        );
      }
    }
  };

  // Écoute automatique de la reconnexion Internet avec rafales de sécurité (+0s, +2s, +5s, +10s pour le délai DNS mobile/Wi-Fi)
  const handleOnline = () => {
    reconnectTimers.forEach((t) => clearTimeout(t));
    reconnectTimers = [];

    triggerAutoSyncNow(true);
    [2000, 5000, 10000].forEach((delayMs) => {
      const t = setTimeout(() => {
        if (!isCancelled && navigator.onLine && (hasPendingOfflineData() || !isSnapshotHealthy)) {
          triggerAutoSyncNow(false);
        }
      }, delayMs);
      reconnectTimers.push(t);
    });
  };

  const handleOffline = () => {
    isSnapshotHealthy = false;
    const pendingCount = getPendingOfflineCount();
    callbacks.onStatusChange(
      'offline',
      pendingCount > 0
        ? `Mode Hors-Ligne : ${pendingCount} opération(s) sauvegardée(s) sur l’appareil`
        : 'Mode Hors-Ligne : Données sauvegardées sur l’appareil'
    );
  };

  // Synchroniser automatiquement dès que l'utilisateur revient sur l'application (Smartphone / Onglet)
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      if (hasPendingOfflineData() || !isSnapshotHealthy) {
        triggerAutoSyncNow(false);
      }
    }
  };

  // Écoute des changements de qualité réseau Android / Chrome (2G -> 3G -> 4G -> Wi-Fi)
  const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const handleConnectionChange = () => {
    if (navigator.onLine && (hasPendingOfflineData() || !isSnapshotHealthy)) {
      triggerAutoSyncNow(false);
    }
  };

  // Écoute des événements Service Worker Background Sync
  const handleSwMessage = (event: MessageEvent) => {
    if (event.data && event.data.action === 'TRIGGER_CLOUD_SYNC' && navigator.onLine) {
      triggerAutoSyncNow(false);
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('focus', handleVisibilityOrFocus);
  document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  if (navConn && typeof navConn.addEventListener === 'function') {
    navConn.addEventListener('change', handleConnectionChange);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
  }

  // Heartbeat automatique toutes les 6 secondes : envoie les ventes hors-ligne et reconnecte le Cloud dès que les paquets passent
  const retryInterval = setInterval(() => {
    if (navigator.onLine && (hasPendingOfflineData() || !isSnapshotHealthy || !unsubSnapshot)) {
      triggerAutoSyncNow(false);
    }
  }, 6000);

  return () => {
    isCancelled = true;
    activeCallbacks = null;
    reconnectTimers.forEach((t) => clearTimeout(t));
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    if (navConn && typeof navConn.removeEventListener === 'function') {
      navConn.removeEventListener('change', handleConnectionChange);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
    clearInterval(retryInterval);
    if (unsubSnapshot) {
      unsubSnapshot();
    }
  };
}

let pushTimer: any = null;

/**
 * Envoie les données modifiées au Cloud Firestore.
 * 1. Sauvegarde immédiatement (0 ms) dans la file hors-ligne persistante + métadonnées dirty.
 * 2. Si en ligne, lance `flushOfflineQueue()` qui fusionne proprement avec le serveur sans jamais écraser les autres appareils.
 */
export async function pushToCloud(partialData: Partial<CloudStoreData>): Promise<void> {
  const deviceId = getDeviceId();
  const timestamp = new Date().toISOString();
  const cleanPartial = sanitizeForFirestore(partialData);

  // 1. Toujours enregistrer IMMÉDIATEMENT (0 ms) dans la file locale hors-ligne
  saveOfflineQueue({
    ...cleanPartial,
    lastDeviceId: deviceId,
    updatedAt: timestamp,
  });

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
        `Mode Hors-Ligne : ${getPendingOfflineCount()} opération(s) enregistrée(s) (envoi auto dès le retour du réseau)`
      );
    }
    return;
  }

  if (pushTimer) clearTimeout(pushTimer);

  return new Promise((resolve) => {
    pushTimer = setTimeout(async () => {
      try {
        await flushOfflineQueue();
        resolve();
      } catch (err) {
        console.warn('Cloud sync push warning (conservé dans la file hors-ligne pour envoi auto):', err);
        if (activeCallbacks) {
          activeCallbacks.onStatusChange(
            'offline',
            `Hors-Ligne : ${getPendingOfflineCount()} opération(s) sécurisée(s) (en attente de réseau stable)`
          );
        }
        resolve();
      }
    }, 150);
  });
}

/**
 * Envoi immédiat forcé sans délai de temporisation.
 */
export async function forcePushToCloud(partialData: Partial<CloudStoreData>): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const deviceId = getDeviceId();
  const cleanPartial = sanitizeForFirestore({
    ...partialData,
    lastDeviceId: deviceId,
    updatedAt: new Date().toISOString(),
  });
  saveOfflineQueue(cleanPartial);

  if (!navigator.onLine) {
    if (activeCallbacks) {
      activeCallbacks.onStatusChange(
        'offline',
        `Mode Hors-Ligne : ${getPendingOfflineCount()} opération(s) enregistrée(s) (synchronisation auto au retour du réseau)`
      );
    }
    return;
  }

  try {
    await flushOfflineQueue();
  } catch (err) {
    console.warn('forcePushToCloud offline warning:', err);
    if (activeCallbacks) {
      activeCallbacks.onStatusChange(
        'offline',
        `Données sécurisées localement (${getPendingOfflineCount()} en attente de réseau)`
      );
    }
  }
}

/**
 * Récupère directement l'état le plus frais depuis le serveur Cloud Firestore
 * (en fusionnant d'abord toute saisie hors-ligne en attente pour ne jamais l'écraser).
 */
export async function pullFromCloud(): Promise<CloudStoreData | null> {
  if (!navigator.onLine) {
    return null;
  }
  try {
    if (hasPendingOfflineData()) {
      try {
        await flushOfflineQueue();
      } catch (e) {}
    }
    const { auth, db } = getCloudServices();
    await enableNetwork(db).catch(() => {});
    await ensureCloudAuth(auth);
    const storeDocRef = doc(db, 'stores', getActiveTenantId());
    const snap = await withTimeout(
      getDocFromServer(storeDocRef).catch(() => getDoc(storeDocRef)),
      8000,
      'pullFromCloud timeout'
    );
    if (snap && snap.exists()) {
      const rawData = snap.data() as CloudStoreData;
      const data = hasPendingOfflineData() ? mergeOfflineQueueOverRemote(rawData) : rawData;
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
