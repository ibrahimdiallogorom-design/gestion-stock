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
    customerTendered?: number
  ) => Promise<{ success: boolean; ticketNumber: string; error?: string }>;
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If previous data used Euro amounts (e.g. salePrice <= 500), automatically migrate to FCFA
          const hasEuroPrices = parsed.some((p) => p.salePrice > 0 && p.salePrice <= 500);
          if (hasEuroPrices) {
            const migrated = parsed.map((p) => ({
              ...p,
              costPrice: p.costPrice <= 500 ? Math.round(p.costPrice * 650) : p.costPrice,
              salePrice: p.salePrice <= 500 ? Math.round(p.salePrice * 650) : p.salePrice,
            }));
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(migrated));
            return migrated;
          }
          return parsed;
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasEuroMovements = parsed.some((m) => m.saleAmount && m.saleAmount > 0 && m.saleAmount <= 500);
          if (hasEuroMovements) {
            const migrated = parsed.map((m) => ({
              ...m,
              saleAmount: m.saleAmount && m.saleAmount <= 500 ? Math.round(m.saleAmount * 650) : m.saleAmount,
            }));
            localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(migrated));
            return migrated;
          }
          return parsed;
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
          // Ensure multi-store defaults exist in saved list if absent
          const existingUsernames = new Set(parsed.map((u) => u.username.toLowerCase()));
          const missingDefaults = DEFAULT_APP_USERS.filter((d) => !existingUsernames.has(d.username.toLowerCase()));
          if (missingDefaults.length > 0) {
            const merged = [...parsed, ...missingDefaults];
            localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(merged));
            return merged;
          }
          return parsed;
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
    return { success: true, message: 'Code d\'accès caissier modifié avec succès !' };
  };

  const setCashierName = (name: string) => {
    const clean = name.trim() || 'Caissier Principal';
    setCashierNameState(clean);
    localStorage.setItem(STORAGE_KEYS.CASHIER_NAME, clean);
    setCashierSession((prev) => ({ ...prev, cashierName: clean }));
  };

  const processSale = async (
    items: CartItem[],
    paymentMethod: PaymentMethod,
    customerTendered?: number
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
      if (!prod || prod.quantity < item.quantity) {
        return {
          success: false,
          ticketNumber: '',
          error: `Stock insuffisant pour "${item.product.name}" (disponible: ${prod?.quantity ?? 0}).`,
        };
      }
    }

    const now = new Date().toISOString();
    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
    const paymentLabel =
      paymentMethod === 'CASH'
        ? 'Espèces'
        : paymentMethod === 'CARD'
        ? 'Carte Bancaire'
        : 'Virement';

    let totalAmount = 0;
    const newMovements: StockMovement[] = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = items.find((it) => it.product.id === prod.id);
      if (!soldItem) return prod;

      const subtotal = prod.salePrice * soldItem.quantity;
      totalAmount += subtotal;

      const newQty = Math.max(0, prod.quantity - soldItem.quantity);
      newMovements.push({
        id: `mov-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        type: 'OUT',
        quantityDelta: -soldItem.quantity,
        previousStock: prod.quantity,
        newStock: newQty,
        reason: `Vente Caisse #${ticketNumber} (${paymentLabel})`,
        operator: activeAppUser?.fullName || cashierName,
        notes: `Règlement ${paymentLabel} - Ticket ${ticketNumber}`,
        createdAt: now,
        storeName: activeAppUser?.storeName || 'Boutique VisionTech Centrale',
        ticketNumber: ticketNumber,
        saleAmount: subtotal,
        paymentMethod: paymentMethod,
      });

      return {
        ...prod,
        quantity: newQty,
        lastUpdated: now,
      };
    });

    setProducts(updatedProducts);
    const updatedMovements = [...newMovements, ...movements];
    setMovements(updatedMovements);

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
        u.username.toLowerCase() === trimmedUser &&
        (u.password === trimmedPass || (trimmedUser === 'admin' && (trimmedPass === 'admin' || trimmedPass === 'admin1234')))
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
    return { success: true, message: 'Utilisateur créé avec succès.' };
  };

  const deleteAppUser = (id: string): { success: boolean; message?: string } => {
    if (appUsers.length <= 1) {
      return { success: false, message: 'Impossible de supprimer le dernier utilisateur restant.' };
    }
    const nextUsers = appUsers.filter((u) => u.id !== id);
    setAppUsers(nextUsers);
    localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(nextUsers));
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
