export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export type StockStatus = 'normal' | 'low' | 'out_of_stock' | 'overstock';

export type ThemeStyle = 'modern_saas' | 'dark_logistics' | 'luxury_boutique' | 'nordic_clean';

export type ViewMode = 'table' | 'cards' | 'kanban';

export type DisplayDensity = 'compact' | 'normal' | 'touch';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minThreshold: number;
  costPrice: number; // Prix d'achat HT (FCFA)
  salePrice: number; // Prix de vente TTC (FCFA)
  supplier: string;
  location?: string;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  type: MovementType;
  quantityDelta: number; // positif pour IN, négatif pour OUT
  previousStock: number;
  newStock: number;
  reason: string;
  operator: string;
  notes?: string;
  createdAt: string;
  storeName?: string;
  ticketNumber?: string;
  saleAmount?: number;
  paymentMethod?: PaymentMethod;
}

export interface SheetsSyncState {
  spreadsheetId: string | null;
  spreadsheetTitle: string;
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage: string | null;
  autoSync: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  category: string;
  rating: number;
  minOrderAmount?: number;
}

export type ViewTab = 'dashboard' | 'inventory' | 'caisse' | 'reports' | 'movements' | 'suppliers' | 'sheets' | 'design_system' | 'settings';

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface CashierSession {
  isUnlocked: boolean;
  cashierName: string;
  unlockedAt: string | null;
  totalSalesCount: number;
  totalSalesAmount: number;
}

export type UserRole = 'ADMIN' | 'CASHIER';

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password: string;
  storeName?: string;
  createdAt: string;
}

