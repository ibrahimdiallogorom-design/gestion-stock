import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  StockMovement,
  MovementType,
  SheetsSyncState,
  ViewTab,
  StockStatus,
  ThemeStyle,
  ViewMode,
  DisplayDensity,
  Supplier,
  CartItem,
  PaymentMethod,
  CashierSession,
  AppUser,
  UserRole,
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, INITIAL_SUPPLIERS } from '../data/initialData';
import { initAuth, googleSignIn, logout, getAccessToken } from '../services/firebaseAuth';
import { pushDataToSheets, pullDataFromSheets, createSpreadsheetWithTemplate, extractSpreadsheetId } from '../services/googleSheets';
import { initCloudSync, pushToCloud, CloudSyncStatus, getDeviceId } from '../services/cloudSync';
import { User } from 'firebase/auth';

interface StockContextType {
  products: Product[];
  movements: StockMovement[];
  suppliers: Supplier[];
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  // Design system & presentation controls
  theme: ThemeStyle;
  setTheme: (theme: ThemeStyle) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  density: DisplayDensity;
  setDensity: (density: DisplayDensity) => void;
  // Auth state
  currentUser: User | null;
  hasGoogleToken: boolean;
  isLoggingIn: boolean;
  loginWithGoogle: () => Promise<void>;
  logoutGoogle: () => Promise<void>;
  // Sheets sync
  sheetsSync: SheetsSyncState;
  setSpreadsheetId: (id: string) => void;
  syncToSheetsAction: () => Promise<void>;
  importFromSheetsAction: () => Promise<void>;
  createSheetsAction: (title?: string) => Promise<string>;
  toggleAutoSync: () => void;
  // Stock actions
  recordMovement: (
    productId: string,
    type: MovementType,
    quantity: number,
    reason: string,
    operator: string,
    notes?: string
  ) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  resetToDefaultData: () => void;
  // Modal states
  movementModal: {
    isOpen: boolean;
    productId?: string;
    defaultType?: MovementType;
  };
  openMovementModal: (productId?: string, defaultType?: MovementType) => void;
  closeMovementModal: () => void;
  productModal: {
    isOpen: boolean;
    product?: Product;
  };
  openProductModal: (product?: Product) => void;
  closeProductModal: () => void;
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  };
  openConfirmModal: (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive?: boolean,
    confirmLabel?: string
  ) => void;
  closeConfirmModal: () => void;
  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  stockFilter: StockStatus | 'all';
  setStockFilter: (status: StockStatus | 'all') => void;
  // Cashier security & POS state
  isCashierUnlocked: boolean;
  cashierPin: string;
  cashierName: string;
  cashierSession: CashierSession;
  unlockCashier: (pin: string) => boolean;
  lockCashier: () => void;
  changeCashierPin: (oldPin: string, newPin: string) => { success: boolean; message: string };
  setCashierName: (name: string) => void;
  processSale: (
    items: CartItem[],
    paymentMethod: PaymentMethod,
    customerTendered?: number,
    acompteAmount?: number,
    remainingAmount?: number,
    customerName?: string
  ) => Promise<{ success: boolean; ticketNumber: string; error?: string }>;
  clearAllProducts: () => void;
  repairInflatedPrices: () => void;
  // Multi-Store & Stock Distribution
  distributeProduct: (
    productId: string,
    targetUserId: string,
    quantity: number,
    notes?: string
  ) => Promise<{ success: boolean; message: string }>;
  recallProduct: (
    productId: string,
    sourceUserId: string,
    quantity: number,
    notes?: string
  ) => Promise<{ success: boolean; message: string }>;
  distributionModal: {
    isOpen: boolean;
    productId?: string;
    defaultTargetUserId?: string;
  };
  openDistributionModal: (productId?: string, defaultTargetUserId?: string) => void;
  closeDistributionModal: () => void;
  // Global Application Authentication & User Accounts
  activeAppUser: AppUser | null;
  appUsers: AppUser[];
  loginAppUser: (username: string, password: string) => { success: boolean; message?: string };
  logoutAppUser: () => void;
  updateAppUser: (id: string, updates: Partial<AppUser>) => { success: boolean; message?: string };
  createAppUser: (userData: Omit<AppUser, 'id' | 'createdAt'>) => { success: boolean; message?: string };
  deleteAppUser: (id: string) => { success: boolean; message?: string };
  isSwitchAccountOpen: boolean;
  openSwitchAccountModal: () => void;
  closeSwitchAccountModal: () => void;
  switchAccountFast: (userId: string) => { success: boolean; message?: string };
  // Real-time Cloud Sync (Firestore)
  cloudStatus: CloudSyncStatus;
  cloudStatusMessage: string;
  forceSyncCloud: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'stockflow_products_v1',
  MOVEMENTS: 'stockflow_movements_v1',
  SHEETS_CONFIG: 'stockflow_sheets_config_v1',
  THEME: 'stockflow_theme_v1',
  VIEW_MODE: 'stockflow_view_mode_v1',
  DENSITY: 'stockflow_density_v1',
  CASHIER_PIN: 'stockflow_cashier_pin_v1',
  CASHIER_NAME: 'stockflow_cashier_name_v1',
  APP_USERS: 'stockflow_app_users_v2',
  ACTIVE_USER: 'stockflow_active_user_v2',
};

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge all fictional / demo products (prod-001 to prod-010, etc.)
          const sanitized = parsed.filter(
            (p) => !p.id.startsWith('prod-00') && !p.id.startsWith('prod-010')
          );
          // Clean products: heal any prices that were artificially multiplied by 650
          const cleanProducts = sanitized.map((p) => {
            let cost = Number(p.costPrice) || 0;
            let sale = Number(p.salePrice) || 0;

            // Auto-heal prices that were inflated by the 650 bug
            while (cost >= 650 && cost % 650 === 0 && cost > 50000) {
              cost = Math.round(cost / 650);
            }
            while (sale >= 650 && sale % 650 === 0 && sale > 50000) {
              sale = Math.round(sale / 650);
            }

            const distributed = p.distributedQuantities || {};
            const sumDist = Object.values(distributed).reduce((a, b) => a + (Number(b) || 0), 0);
            const totalQty = Math.max(0, Number(p.quantity) || 0);
            const centralQty = p.centralQuantity !== undefined ? Math.max(0, Number(p.centralQuantity) || 0) : Math.max(0, totalQty - sumDist);

            return {
              ...p,
              quantity: totalQty,
              centralQuantity: centralQty,
              distributedQuantities: distributed,
              minThreshold: Math.max(0, Number(p.minThreshold) || 0),
              costPrice: Math.max(0, cost),
              salePrice: Math.max(0, sale),
            };
          });
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cleanProducts));
          return cleanProducts;
        }
      }
    } catch (e) {
      console.error('Error loading products from cache', e);
    }
    return INITIAL_PRODUCTS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      if (saved) {
        const parsed: StockMovement[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge all fictional demo movements (mov-1001 to mov-1006)
          const sanitized = parsed.filter((m) => !m.id.startsWith('mov-100'));
          localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(sanitized));
          return sanitized;
        }
      }
    } catch (e) {
      console.error('Error loading movements from cache', e);
    }
    return INITIAL_MOVEMENTS;
  });

  const [suppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);

  const [sheetsSync, setSheetsSync] = useState<SheetsSyncState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHEETS_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading sheets config from cache', e);
    }
    return {
      spreadsheetId: null,
      spreadsheetTitle: 'StockFlow - Inventaire & Mouvements',
      lastSyncedAt: null,
      status: 'idle',
      errorMessage: null,
      autoSync: true,
    };
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Design system & visual presentation states
  const [theme, setThemeState] = useState<ThemeStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved) return saved as ThemeStyle;
    } catch (e) {}
    return 'modern_saas';
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      if (saved) return saved as ViewMode;
    } catch (e) {}
    return 'cards';
  });

  const [density, setDensityState] = useState<DisplayDensity>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DENSITY);
      if (saved) return saved as DisplayDensity;
    } catch (e) {}
    return 'normal';
  });

  const setTheme = (t: ThemeStyle) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEYS.THEME, t);
  };

  const setViewMode = (m: ViewMode) => {
    setViewModeState(m);
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, m);
  };

  const setDensity = (d: DisplayDensity) => {
    setDensityState(d);
    localStorage.setItem(STORAGE_KEYS.DENSITY, d);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockStatus | 'all'>('all');

  // Cashier Authentication & POS session states
  const [cashierPin, setCashierPinState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASHIER_PIN);
      if (saved) return saved;
    } catch (e) {}
    return '1234';
  });

  const [cashierName, setCashierNameState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASHIER_NAME);
      if (saved) return saved;
    } catch (e) {}
    return 'Caissier Principal';
  });

  const [isCashierUnlocked, setIsCashierUnlocked] = useState<boolean>(false);
  const [cashierSession, setCashierSession] = useState<CashierSession>({
    isUnlocked: false,
    cashierName: 'Caissier Principal',
    unlockedAt: null,
    totalSalesCount: 0,
    totalSalesAmount: 0,
  });

  // Global Multi-User Authentication state
  const DEFAULT_APP_USERS: AppUser[] = [
    {
      id: 'user-admin',
      username: 'admin',
      fullName: 'Administrateur Gérant',
      role: 'ADMIN',
      password: 'admin',
      storeName: 'Boutique VisionTech Centrale',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'user-caissier-1',
      username: 'caissier',
      fullName: 'Caissier VisionTech',
      role: 'CASHIER',
      password: '1234',
      storeName: 'Boutique VisionTech Centrale',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'user-caissier-2',
      username: 'caisse_ouaga',
      fullName: 'Caissier Ouagadougou',
      role: 'CASHIER',
      password: '1234',
      storeName: 'Boutique Ouagadougou',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'user-caissier-3',
      username: 'caisse_gorom',
      fullName: 'Caissier Gorom-Gorom',
      role: 'CASHIER',
      password: '1234',
      storeName: 'Boutique Gorom-Gorom',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  const [appUsers, setAppUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APP_USERS);
      if (saved) {
        const parsed: AppUser[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep user modifications intact, dedup by username
          const seen = new Set<string>();
          const deduped: AppUser[] = [];
          for (let i = parsed.length - 1; i >= 0; i--) {
            const u = parsed[i];
            const key = (u.username || '').trim().toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              deduped.unshift(u);
            }
          }
          const finalUsers = deduped.length > 0 ? deduped : parsed;
          localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(finalUsers));
          return finalUsers;
        }
      }
    } catch (e) {}
    return DEFAULT_APP_USERS;
  });

  const [activeAppUser, setActiveAppUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null; // Null by default on any fresh device or browser!
  });

  // Switch Account Modal state
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const openSwitchAccountModal = () => setIsSwitchAccountOpen(true);
  const closeSwitchAccountModal = () => setIsSwitchAccountOpen(false);

  // Modals
  const [movementModal, setMovementModal] = useState<{
    isOpen: boolean;
    productId?: string;
    defaultType?: MovementType;
  }>({ isOpen: false });

  const [productModal, setProductModal] = useState<{
    isOpen: boolean;
    product?: Product;
  }>({ isOpen: false });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [distributionModal, setDistributionModal] = useState<{
    isOpen: boolean;
    productId?: string;
    defaultTargetUserId?: string;
  }>({
    isOpen: false,
  });

  const openDistributionModal = (productId?: string, defaultTargetUserId?: string) => {
    setDistributionModal({
      isOpen: true,
      productId,
      defaultTargetUserId,
    });
  };

  const closeDistributionModal = () => {
    setDistributionModal({
      isOpen: false,
      productId: undefined,
      defaultTargetUserId: undefined,
    });
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHEETS_CONFIG, JSON.stringify(sheetsSync));
  }, [sheetsSync]);

  // Cloud Sync Status states
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('connecting');
  const [cloudStatusMessage, setCloudStatusMessage] = useState<string>('Connexion Cloud...');

  // Initialize Real-time Multi-Device Cloud Sync via Firebase Firestore
  useEffect(() => {
    const unsubCloud = initCloudSync({
      onRemoteData: (remote) => {
        const myDeviceId = getDeviceId();
        // If the update came from another device or on initial load
        if (remote.lastDeviceId !== myDeviceId) {
          if (remote.appUsers && Array.isArray(remote.appUsers) && remote.appUsers.length > 0) {
            setAppUsers(remote.appUsers);
            localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(remote.appUsers));
            // Keep active user synchronized if currently logged in
            setActiveAppUser((current) => {
              if (!current) return null;
              const matching = remote.appUsers!.find((u) => u.id === current.id || u.username.toLowerCase() === current.username.toLowerCase());
              if (matching) {
                localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(matching));
                return matching;
              }
              return current;
            });
          }
          if (remote.products && Array.isArray(remote.products) && remote.products.length > 0) {
            setProducts(remote.products);
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(remote.products));
          }
          if (remote.movements && Array.isArray(remote.movements)) {
            setMovements(remote.movements);
            localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(remote.movements));
          }
          if (remote.cashierPin) {
            setCashierPinState(remote.cashierPin);
            localStorage.setItem(STORAGE_KEYS.CASHIER_PIN, remote.cashierPin);
          }
          if (remote.cashierName) {
            setCashierNameState(remote.cashierName);
            localStorage.setItem(STORAGE_KEYS.CASHIER_NAME, remote.cashierName);
          }
        }

        // If cloud does not have users yet, seed cloud from this local device!
        if (!remote.appUsers || remote.appUsers.length === 0) {
          pushToCloud({
            appUsers,
            products,
            movements,
            cashierPin,
            cashierName,
            storeName: 'Boutique VisionTech',
          });
        }
      },
      onStatusChange: (status, details) => {
        setCloudStatus(status);
        if (details) setCloudStatusMessage(details);
      },
    });

    return () => unsubCloud();
  }, []);

  const forceSyncCloud = async () => {
    setCloudStatus('connecting');
    setCloudStatusMessage('Synchronisation Cloud en cours...');
    await pushToCloud({
      appUsers,
      products,
      movements,
      cashierPin,
      cashierName,
      storeName: 'Boutique VisionTech',
    });
    setCloudStatus('connected');
    setCloudStatusMessage('Données synchronisées dans le Cloud');
  };

  // Init Firebase Auth on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasGoogleToken(!!token);
      },
      () => {
        setCurrentUser(null);
        setHasGoogleToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setHasGoogleToken(true);
      }
    } catch (err: any) {
      console.error('Login error', err);
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'Échec de la connexion à Google.',
      }));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logoutGoogle = async () => {
    await logout();
    setCurrentUser(null);
    setHasGoogleToken(false);
  };

  const setSpreadsheetId = (idOrUrl: string) => {
    const cleanId = extractSpreadsheetId(idOrUrl);
    setSheetsSync((prev) => ({
      ...prev,
      spreadsheetId: cleanId,
      status: 'idle',
      errorMessage: null,
    }));
  };

  const toggleAutoSync = () => {
    setSheetsSync((prev) => ({ ...prev, autoSync: !prev.autoSync }));
  };

  // Push to Google Sheets
  const syncToSheetsAction = async () => {
    if (!sheetsSync.spreadsheetId) {
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Veuillez spécifier un identifiant de feuille Google Sheets ou en créer une.',
      }));
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Authentification Google requise pour synchroniser avec Sheets.',
      }));
      return;
    }

    setSheetsSync((prev) => ({ ...prev, status: 'syncing', errorMessage: null }));

    try {
      await pushDataToSheets(sheetsSync.spreadsheetId, products, movements, token);
      setSheetsSync((prev) => ({
        ...prev,
        status: 'success',
        lastSyncedAt: new Date().toISOString(),
        errorMessage: null,
      }));
    } catch (error: any) {
      console.error('Error syncing to sheets', error);
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: error.message || 'Erreur lors de la synchronisation vers Google Sheets.',
      }));
    }
  };

  // Pull from Google Sheets
  const importFromSheetsAction = async () => {
    if (!sheetsSync.spreadsheetId) {
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Veuillez renseigner un ID de feuille Google Sheets valide.',
      }));
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Connexion Google requise.',
      }));
      return;
    }

    setSheetsSync((prev) => ({ ...prev, status: 'syncing', errorMessage: null }));

    try {
      const data = await pullDataFromSheets(sheetsSync.spreadsheetId, token);
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
        setSheetsSync((prev) => ({
          ...prev,
          status: 'success',
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        }));
      }
    } catch (error: any) {
      console.error('Error pulling from sheets', error);
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: error.message || "Erreur lors de l'importation depuis Google Sheets.",
      }));
    }
  };

  // Create new Sheets Template
  const createSheetsAction = async (title?: string): Promise<string> => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Connexion Google requise pour créer une feuille de calcul.');
    }

    setSheetsSync((prev) => ({ ...prev, status: 'syncing', errorMessage: null }));

    try {
      const sheetTitle = title || 'StockFlow - Inventaire & Mouvements';
      const created = await createSpreadsheetWithTemplate(sheetTitle, token);
      
      // Auto-push current data into the freshly created spreadsheet
      await pushDataToSheets(created.id, products, movements, token);

      setSheetsSync((prev) => ({
        ...prev,
        spreadsheetId: created.id,
        spreadsheetTitle: sheetTitle,
        lastSyncedAt: new Date().toISOString(),
        status: 'success',
        errorMessage: null,
      }));

      return created.url;
    } catch (error: any) {
      setSheetsSync((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: error.message || 'Erreur lors de la création de la feuille Google Sheets.',
      }));
      throw error;
    }
  };

  // Stock operations
  const recordMovement = async (
    productId: string,
    type: MovementType,
    quantity: number,
    reason: string,
    operator: string,
    notes?: string
  ) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    let delta = 0;
    if (type === 'IN' || type === 'RETURN') {
      delta = Math.abs(quantity);
    } else if (type === 'OUT') {
      delta = -Math.abs(quantity);
    } else if (type === 'ADJUSTMENT') {
      // Direct absolute new quantity specified
      delta = quantity - targetProduct.quantity;
    }

    const previousStock = targetProduct.quantity;
    const newStock = Math.max(0, previousStock + delta);
    const now = new Date().toISOString();

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: targetProduct.id,
      productSku: targetProduct.sku,
      productName: targetProduct.name,
      type,
      quantityDelta: delta,
      previousStock,
      newStock,
      reason,
      operator: operator || (currentUser?.displayName || 'Opérateur Boutique'),
      notes,
      createdAt: now,
    };

    const updatedProducts = products.map((p) =>
      p.id === productId
        ? { ...p, quantity: newStock, lastUpdated: now }
        : p
    );
    const updatedMovements = [newMovement, ...movements];

    setProducts(updatedProducts);
    setMovements(updatedMovements);
    pushToCloud({ products: updatedProducts, movements: updatedMovements });

    // Auto-sync if configured and token available
    if (sheetsSync.autoSync && sheetsSync.spreadsheetId && hasGoogleToken) {
      const token = await getAccessToken();
      if (token) {
        pushDataToSheets(sheetsSync.spreadsheetId, updatedProducts, updatedMovements, token)
          .then(() => {
            setSheetsSync((prev) => ({
              ...prev,
              lastSyncedAt: new Date().toISOString(),
              status: 'success',
            }));
          })
          .catch((err) => {
            console.warn('Auto-sync error:', err);
          });
      }
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'lastUpdated'>) => {
    const now = new Date().toISOString();
    const newId = `prod-${Date.now()}`;
    const newProd: Product = {
      ...productData,
      id: newId,
      lastUpdated: now,
    };

    const updatedProducts = [newProd, ...products];
    let updatedMovements = movements;

    // If initial quantity > 0, log an initial entry movement
    if (newProd.quantity > 0) {
      const initialMovement: StockMovement = {
        id: `mov-${Date.now()}`,
        productId: newProd.id,
        productSku: newProd.sku,
        productName: newProd.name,
        type: 'IN',
        quantityDelta: newProd.quantity,
        previousStock: 0,
        newStock: newProd.quantity,
        reason: 'Création de fiche article (stock initial)',
        operator: currentUser?.displayName || 'Opérateur Boutique',
        notes: 'Initialisation du catalogue',
        createdAt: now,
      };
      updatedMovements = [initialMovement, ...movements];
      setMovements(updatedMovements);
    }

    setProducts(updatedProducts);
    pushToCloud({ products: updatedProducts, movements: updatedMovements });

    if (sheetsSync.autoSync && sheetsSync.spreadsheetId && hasGoogleToken) {
      const token = await getAccessToken();
      if (token) {
        pushDataToSheets(sheetsSync.spreadsheetId, updatedProducts, updatedMovements, token).catch(
          console.warn
        );
      }
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const now = new Date().toISOString();
    const updatedProducts = products.map((p) =>
      p.id === id ? { ...p, ...updates, lastUpdated: now } : p
    );
    setProducts(updatedProducts);
    pushToCloud({ products: updatedProducts });

    if (sheetsSync.autoSync && sheetsSync.spreadsheetId && hasGoogleToken) {
      const token = await getAccessToken();
      if (token) {
        pushDataToSheets(sheetsSync.spreadsheetId, updatedProducts, movements, token).catch(
          console.warn
        );
      }
    }
  };

  const deleteProduct = async (id: string) => {
    const updatedProducts = products.filter((p) => p.id !== id);
    setProducts(updatedProducts);
    pushToCloud({ products: updatedProducts });

    if (sheetsSync.autoSync && sheetsSync.spreadsheetId && hasGoogleToken) {
      const token = await getAccessToken();
      if (token) {
        pushDataToSheets(sheetsSync.spreadsheetId, updatedProducts, movements, token).catch(
          console.warn
        );
      }
    }
  };

  const resetToDefaultData = () => {
    setProducts(INITIAL_PRODUCTS);
    setMovements(INITIAL_MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
  };

  // Cashier security & POS methods
  const unlockCashier = (pin: string): boolean => {
    if (pin.trim() === cashierPin.trim()) {
      setIsCashierUnlocked(true);
      setCashierSession((prev) => ({
        ...prev,
        isUnlocked: true,
        cashierName,
        unlockedAt: prev.unlockedAt || new Date().toISOString(),
      }));
      return true;
    }
    return false;
  };

  const lockCashier = () => {
    setIsCashierUnlocked(false);
    setCashierSession((prev) => ({
      ...prev,
      isUnlocked: false,
    }));
  };

  const changeCashierPin = (oldPin: string, newPin: string): { success: boolean; message: string } => {
    if (oldPin.trim() !== cashierPin.trim()) {
      return { success: false, message: 'Le mot de passe / code PIN actuel est incorrect.' };
    }
    if (!newPin || newPin.trim().length < 4) {
      return { success: false, message: 'Le nouveau mot de passe / PIN doit comporter au moins 4 caractères.' };
    }
    const cleanPin = newPin.trim();
    setCashierPinState(cleanPin);
    localStorage.setItem(STORAGE_KEYS.CASHIER_PIN, cleanPin);

    // Synchroniser automatiquement avec les comptes utilisateurs (appUsers)
    setAppUsers((prevUsers) => {
      const updated = prevUsers.map((u) => {
        if (activeAppUser?.id === u.id || (activeAppUser?.role === 'CASHIER' && u.id === activeAppUser.id) || (u.role === 'CASHIER' && u.username === 'caissier')) {
          return { ...u, password: cleanPin };
        }
        return u;
      });
      localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(updated));
      pushToCloud({ cashierPin: cleanPin, appUsers: updated });
      return updated;
    });

    if (activeAppUser && (activeAppUser.role === 'CASHIER' || activeAppUser.username === 'caissier')) {
      const refreshed = { ...activeAppUser, password: cleanPin };
      setActiveAppUser(refreshed);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(refreshed));
    }

    return { success: true, message: 'Code d’accès caisse et mot de passe de connexion synchronisés avec succès !' };
  };

  const setCashierName = (name: string) => {
    const clean = name.trim() || 'Caissier Principal';
    setCashierNameState(clean);
    localStorage.setItem(STORAGE_KEYS.CASHIER_NAME, clean);
    setCashierSession((prev) => ({ ...prev, cashierName: clean }));

    // Synchroniser automatiquement avec appUsers
    setAppUsers((prevUsers) => {
      const updated = prevUsers.map((u) => {
        if (activeAppUser?.id === u.id || (u.role === 'CASHIER' && u.username === 'caissier')) {
          return { ...u, fullName: clean };
        }
        return u;
      });
      localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(updated));
      pushToCloud({ cashierName: clean, appUsers: updated });
      return updated;
    });

    if (activeAppUser && (activeAppUser.role === 'CASHIER' || activeAppUser.username === 'caissier')) {
      const refreshed = { ...activeAppUser, fullName: clean };
      setActiveAppUser(refreshed);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(refreshed));
    }
  };

  const clearAllProducts = () => {
    setProducts([]);
    setMovements([]);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
    pushToCloud({ products: [], movements: [] });
  };

  const repairInflatedPrices = () => {
    const fixed = products.map((p) => {
      let cost = Number(p.costPrice) || 0;
      let sale = Number(p.salePrice) || 0;
      while (cost >= 650 && cost % 650 === 0 && cost > 50000) {
        cost = Math.round(cost / 650);
      }
      while (sale >= 650 && sale % 650 === 0 && sale > 50000) {
        sale = Math.round(sale / 650);
      }
      return {
        ...p,
        costPrice: Math.max(0, cost),
        salePrice: Math.max(0, sale),
      };
    });
    setProducts(fixed);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(fixed));
    pushToCloud({ products: fixed });
  };

  const distributeProduct = async (
    productId: string,
    targetUserId: string,
    quantityToDistribute: number,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (quantityToDistribute <= 0) {
      return { success: false, message: 'La quantité à distribuer doit être supérieure à 0.' };
    }

    const targetUser = appUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, message: 'Vendeur / Caissier destinataire introuvable.' };
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      return { success: false, message: 'Article introuvable dans le catalogue.' };
    }

    const currentCentral = prod.centralQuantity !== undefined ? prod.centralQuantity : prod.quantity;
    if (currentCentral < quantityToDistribute) {
      return {
        success: false,
        message: `Stock insuffisant au Grand Magasin (Disponible: ${currentCentral}, Demandé: ${quantityToDistribute}).`,
      };
    }

    const now = new Date().toISOString();
    const newCentral = currentCentral - quantityToDistribute;
    const newDistributed = { ...(prod.distributedQuantities || {}) };
    newDistributed[targetUserId] = (newDistributed[targetUserId] || 0) + quantityToDistribute;

    const sumDist = Object.values(newDistributed).reduce((a, b) => a + (Number(b) || 0), 0);
    const newTotal = newCentral + sumDist;

    const updatedProduct: Product = {
      ...prod,
      centralQuantity: newCentral,
      distributedQuantities: newDistributed,
      quantity: newTotal,
      lastUpdated: now,
    };

    const updatedProducts = products.map((p) => (p.id === productId ? updatedProduct : p));
    setProducts(updatedProducts);

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${prod.id}`,
      productId: prod.id,
      productSku: prod.sku,
      productName: prod.name,
      type: 'TRANSFER',
      quantityDelta: -quantityToDistribute,
      previousStock: currentCentral,
      newStock: newCentral,
      reason: `Distribution vers ${targetUser.fullName} (${targetUser.storeName || targetUser.username})`,
      operator: activeAppUser?.fullName || 'Responsable Stock',
      storeName: targetUser.storeName || 'Boutique VisionTech',
      targetUserId: targetUser.id,
      targetUserName: targetUser.fullName,
      notes: notes || `Transfert de ${quantityToDistribute} unité(s) depuis le Grand Magasin vers ${targetUser.fullName}`,
      createdAt: now,
    };

    const updatedMovements = [movement, ...movements];
    setMovements(updatedMovements);
    pushToCloud({ products: updatedProducts, movements: updatedMovements });

    if (sheetsSync.autoSync && sheetsSync.spreadsheetId && hasGoogleToken) {
      const token = await getAccessToken();
      if (token) {
        pushDataToSheets(sheetsSync.spreadsheetId, updatedProducts, updatedMovements, token).catch(console.warn);
      }
    }

    return {
      success: true,
      message: `${quantityToDistribute} unité(s) de "${prod.name}" distribuée(s) avec succès à ${targetUser.fullName}.`,
    };
  };

  const recallProduct = async (
    productId: string,
    sourceUserId: string,
    quantityToRecall: number,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (quantityToRecall <= 0) {
      return { success: false, message: 'La quantité à récupérer doit être supérieure à 0.' };
    }

    const sourceUser = appUsers.find((u) => u.id === sourceUserId);
    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      return { success: false, message: 'Article introuvable dans le catalogue.' };
    }

    const currentHeld = prod.distributedQuantities?.[sourceUserId] || 0;
    if (currentHeld < quantityToRecall) {
      return {
        success: false,
        message: `Ce vendeur ne possède que ${currentHeld} unité(s) en stock.`,
      };
    }

    const now = new Date().toISOString();
    const currentCentral = prod.centralQuantity !== undefined ? prod.centralQuantity : Math.max(0, prod.quantity - currentHeld);
    const newCentral = currentCentral + quantityToRecall;
    const newDistributed = { ...(prod.distributedQuantities || {}) };
    newDistributed[sourceUserId] = currentHeld - quantityToRecall;

    const sumDist = Object.values(newDistributed).reduce((a, b) => a + (Number(b) || 0), 0);
    const newTotal = newCentral + sumDist;

    const updatedProduct: Product = {
      ...prod,
      centralQuantity: newCentral,
      distributedQuantities: newDistributed,
      quantity: newTotal,
      lastUpdated: now,
    };

    const updatedProducts = products.map((p) => (p.id === productId ? updatedProduct : p));
    setProducts(updatedProducts);

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${prod.id}`,
      productId: prod.id,
      productSku: prod.sku,
      productName: prod.name,
      type: 'RETURN',
      quantityDelta: quantityToRecall,
      previousStock: currentCentral,
      newStock: newCentral,
      reason: `Retour de stock de ${sourceUser?.fullName || 'Vendeur'} vers le Grand Magasin`,
      operator: activeAppUser?.fullName || 'Responsable Stock',
      storeName: 'Grand Magasin Central',
      notes: notes || `Récupération de ${quantityToRecall} unité(s) vers le Grand Magasin`,
      createdAt: now,
    };

    const updatedMovements = [movement, ...movements];
    setMovements(updatedMovements);
    pushToCloud({ products: updatedProducts, movements: updatedMovements });

    return {
      success: true,
      message: `${quantityToRecall} unité(s) réintégrée(s) au Grand Magasin.`,
    };
  };

  const processSale = async (
    items: CartItem[],
    paymentMethod: PaymentMethod,
    customerTendered?: number,
    acompteAmount?: number,
    remainingAmount?: number,
    customerName?: string
  ): Promise<{ success: boolean; ticketNumber: string; error?: string }> => {
    if (!isCashierUnlocked) {
      return { success: false, ticketNumber: '', error: 'Session caisse verrouillée. Veuillez vous identifier.' };
    }
    if (items.length === 0) {
      return { success: false, ticketNumber: '', error: 'Le panier est vide.' };
    }

    // Verify stock availability
    for (const item of items) {
      const prod = products.find((p) => p.id === item.product.id);
      if (!prod) {
        return { success: false, ticketNumber: '', error: `Article introuvable.` };
      }
      const isCashier = activeAppUser?.role === 'CASHIER';
      const cashierStock = (isCashier && activeAppUser?.id && prod.distributedQuantities?.[activeAppUser.id] !== undefined)
        ? (prod.distributedQuantities[activeAppUser.id] || 0)
        : null;
      const available = cashierStock !== null ? cashierStock : prod.quantity;
      if (available < item.quantity) {
        return {
          success: false,
          ticketNumber: '',
          error: cashierStock !== null
            ? `Stock insuffisant dans votre caisse pour "${item.product.name}" (disponible: ${available}). Demandez une dotation au Grand Magasin.`
            : `Stock insuffisant pour "${item.product.name}" (disponible: ${prod.quantity}).`,
        };
      }
    }

    const now = new Date().toISOString();
    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
    const paymentLabel =
      paymentMethod === 'CASH'
        ? 'Espèces'
        : paymentMethod === 'ACOMPTE'
        ? 'Acompte'
        : paymentMethod === 'CREDIT'
        ? 'Crédit'
        : paymentMethod === 'CARD'
        ? 'Carte Bancaire'
        : 'Virement / Mobile Money';

    let totalAmount = 0;
    const newMovements: StockMovement[] = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = items.find((it) => it.product.id === prod.id);
      if (!soldItem) return prod;

      const subtotal = prod.salePrice * soldItem.quantity;
      totalAmount += subtotal;

      let centralQty = prod.centralQuantity !== undefined ? prod.centralQuantity : prod.quantity;
      const distributed = { ...(prod.distributedQuantities || {}) };

      if (activeAppUser?.role === 'CASHIER' && activeAppUser?.id && distributed[activeAppUser.id] !== undefined) {
        distributed[activeAppUser.id] = Math.max(0, distributed[activeAppUser.id] - soldItem.quantity);
      } else {
        centralQty = Math.max(0, centralQty - soldItem.quantity);
      }
      const sumDist = Object.values(distributed).reduce((a, b) => a + (Number(b) || 0), 0);
      const newQty = centralQty + sumDist;

      newMovements.push({
        id: `mov-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        type: 'OUT',
        quantityDelta: -soldItem.quantity,
        previousStock: prod.quantity,
        newStock: newQty,
        reason: `Vente Caisse #${ticketNumber} (${paymentLabel}${customerName ? ` - ${customerName}` : ''})`,
        operator: activeAppUser?.fullName || cashierName,
        notes: `Règlement ${paymentLabel}${paymentMethod === 'ACOMPTE' ? ` (Acompte payé: ${acompteAmount ?? 0} F, Restant: ${remainingAmount ?? 0} F)` : paymentMethod === 'CREDIT' ? ` (Crédit restant: ${remainingAmount ?? totalAmount} F)` : ''}${customerName ? ` - Client: ${customerName}` : ''} - Ticket ${ticketNumber}`,
        createdAt: now,
        storeName: activeAppUser?.storeName || 'Boutique VisionTech Centrale',
        ticketNumber: ticketNumber,
        saleAmount: subtotal,
        paymentMethod: paymentMethod,
        acompteAmount: acompteAmount,
        remainingAmount: remainingAmount,
        customerName: customerName,
      });

      return {
        ...prod,
        quantity: newQty,
        centralQuantity: centralQty,
        distributedQuantities: distributed,
        lastUpdated: now,
      };
    });

    setProducts(updatedProducts);
    const updatedMovements = [...newMovements, ...movements];
    setMovements(updatedMovements);
    pushToCloud({ products: updatedProducts, movements: updatedMovements });

    setCashierSession((prev) => ({
      ...prev,
      totalSalesCount: prev.totalSalesCount + 1,
      totalSalesAmount: prev.totalSalesAmount + totalAmount,
    }));

    // Trigger auto-sync if enabled
    if (sheetsSync.autoSync && sheetsSync.spreadsheetId && hasGoogleToken) {
      const token = await getAccessToken();
      if (token) {
        pushDataToSheets(sheetsSync.spreadsheetId, updatedProducts, updatedMovements, token).catch((err) => {
          console.warn('Auto-sync error after POS sale:', err);
        });
      }
    }

    return { success: true, ticketNumber };
  };

  // App User Authentication Methods
  const loginAppUser = (username: string, password: string): { success: boolean; message?: string } => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    const found = appUsers.find(
      (u) =>
        u.username.trim().toLowerCase() === trimmedUser &&
        u.password.trim() === trimmedPass
    );

    if (!found) {
      return {
        success: false,
        message: 'Nom d’utilisateur ou mot de passe incorrect. Veuillez vérifier vos identifiants.',
      };
    }

    setActiveAppUser(found);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(found));

    // Role-based startup routing
    if (found.role === 'CASHIER') {
      setIsCashierUnlocked(true);
      setCashierName(found.fullName || found.username);
      setActiveTab('caisse');
    } else {
      setActiveTab('dashboard');
    }

    return { success: true };
  };

  const logoutAppUser = () => {
    setActiveAppUser(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    setIsCashierUnlocked(false);
  };

  const updateAppUser = (id: string, updates: Partial<AppUser>): { success: boolean; message?: string } => {
    if (updates.username) {
      const lowerNew = updates.username.trim().toLowerCase();
      const existing = appUsers.find((u) => u.id !== id && u.username.toLowerCase() === lowerNew);
      if (existing) {
        return { success: false, message: 'Ce nom d’utilisateur est déjà utilisé par un autre compte.' };
      }
    }

    const updated = appUsers.map((u) => (u.id === id ? { ...u, ...updates } : u));
    setAppUsers(updated);
    localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(updated));
    pushToCloud({ appUsers: updated });

    if (activeAppUser && activeAppUser.id === id) {
      const refreshed = { ...activeAppUser, ...updates };
      setActiveAppUser(refreshed);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(refreshed));
    }

    return { success: true, message: 'Compte utilisateur mis à jour avec succès.' };
  };

  const createAppUser = (userData: Omit<AppUser, 'id' | 'createdAt'>): { success: boolean; message?: string } => {
    const lower = userData.username.trim().toLowerCase();
    if (appUsers.some((u) => u.username.toLowerCase() === lower)) {
      return { success: false, message: 'Ce nom d’utilisateur existe déjà.' };
    }

    const newUser: AppUser = {
      ...userData,
      id: `user-${Date.now()}`,
      username: userData.username.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextUsers = [...appUsers, newUser];
    setAppUsers(nextUsers);
    localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(nextUsers));
    pushToCloud({ appUsers: nextUsers });
    return { success: true, message: 'Utilisateur créé avec succès.' };
  };

  const deleteAppUser = (id: string): { success: boolean; message?: string } => {
    if (appUsers.length <= 1) {
      return { success: false, message: 'Impossible de supprimer le dernier utilisateur restant.' };
    }
    const nextUsers = appUsers.filter((u) => u.id !== id);
    setAppUsers(nextUsers);
    localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(nextUsers));
    pushToCloud({ appUsers: nextUsers });
    if (activeAppUser?.id === id) {
      logoutAppUser();
    }
    return { success: true, message: 'Utilisateur supprimé.' };
  };

  const switchAccountFast = (userId: string): { success: boolean; message?: string } => {
    const target = appUsers.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'Compte utilisateur introuvable.' };

    setActiveAppUser(target);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(target));

    if (target.role === 'CASHIER') {
      const name = target.fullName || target.username;
      setCashierNameState(name);
      localStorage.setItem(STORAGE_KEYS.CASHIER_NAME, name);
      setIsCashierUnlocked(true);
      setCashierSession((prev) => ({
        ...prev,
        isUnlocked: true,
        cashierName: name,
        unlockedAt: new Date().toISOString(),
      }));
    }
    setIsSwitchAccountOpen(false);
    return { success: true };
  };

  // Modals helpers
  const openMovementModal = (productId?: string, defaultType: MovementType = 'IN') => {
    setMovementModal({ isOpen: true, productId, defaultType });
  };
  const closeMovementModal = () => setMovementModal({ isOpen: false });

  const openProductModal = (product?: Product) => {
    setProductModal({ isOpen: true, product });
  };
  const closeProductModal = () => setProductModal({ isOpen: false });

  const openConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive: boolean = false,
    confirmLabel?: string
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      isDestructive,
      confirmLabel,
    });
  };
  const closeConfirmModal = () =>
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  return (
    <StockContext.Provider
      value={{
        products,
        movements,
        suppliers,
        activeTab,
        setActiveTab,
        theme,
        setTheme,
        viewMode,
        setViewMode,
        density,
        setDensity,
        currentUser,
        hasGoogleToken,
        isLoggingIn,
        loginWithGoogle,
        logoutGoogle,
        sheetsSync,
        setSpreadsheetId,
        syncToSheetsAction,
        importFromSheetsAction,
        createSheetsAction,
        toggleAutoSync,
        recordMovement,
        addProduct,
        updateProduct,
        deleteProduct,
        resetToDefaultData,
        // Global App Authentication & User Accounts
        activeAppUser,
        appUsers,
        loginAppUser,
        logoutAppUser,
        updateAppUser,
        createAppUser,
        deleteAppUser,
        isSwitchAccountOpen,
        openSwitchAccountModal,
        closeSwitchAccountModal,
        switchAccountFast,
        // Cashier security & POS
        isCashierUnlocked,
        cashierPin,
        cashierName,
        cashierSession,
        unlockCashier,
        lockCashier,
        changeCashierPin,
        setCashierName,
        processSale,
        clearAllProducts,
        repairInflatedPrices,
        // Multi-Store & Stock Distribution
        distributeProduct,
        recallProduct,
        distributionModal,
        openDistributionModal,
        closeDistributionModal,
        // Modals
        movementModal,
        openMovementModal,
        closeMovementModal,
        productModal,
        openProductModal,
        closeProductModal,
        confirmModal,
        openConfirmModal,
        closeConfirmModal,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        stockFilter,
        setStockFilter,
        // Real-time Cloud Sync
        cloudStatus,
        cloudStatusMessage,
        forceSyncCloud,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
};
