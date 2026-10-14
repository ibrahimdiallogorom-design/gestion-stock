export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';

export type StockStatus = 'normal' | 'low' | 'out_of_stock' | 'overstock';

export type ThemeStyle = 'modern_saas' | 'dark_logistics' | 'luxury_boutique' | 'nordic_clean';

export type ViewMode = 'table' | 'cards' | 'kanban';

export type DisplayDensity = 'compact' | 'normal' | 'touch';

export const STANDARD_CATEGORIES = [
  'Électronique & Informatique',
  'Alimentation & Boissons',
  'Médicaments & Pharmacie',
  'Mode & Vêtements',
  'Cosmétique & Beauté',
  'Quincaillerie & Matériaux',
  'Fournitures & Papeterie',
  'Divers & Général',
] as const;

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number; // Stock total de l'entreprise (Grand Magasin + tous les vendeurs)
  centralQuantity?: number; // Stock disponible au Grand Magasin (Dépôt)
  distributedQuantities?: Record<string, number>; // Répartition du stock { [userId]: quantité }
  minThreshold: number;
  costPrice: number; // Prix d'achat (FCFA)
  salePrice: number; // Prix de vente (FCFA)
  supplier: string;
  location?: string;
  lastUpdated: string;
  imageUrl?: string; // Image / photo du produit (base64 compressée ou URL)
  description?: string; // Description commerciale pour le catalogue client
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
  acompteAmount?: number; // Acompte payé
  remainingAmount?: number; // Total restant (Crédit)
  customerName?: string; // Nom du client (pour crédit / acompte)
  targetUserId?: string;
  targetUserName?: string;
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

export type ViewTab =
  | 'dashboard'
  | 'inventory'
  | 'distribution'
  | 'caisse'
  | 'reports'
  | 'movements'
  | 'accounting'
  | 'catalog'
  | 'suppliers'
  | 'sheets'
  | 'design_system'
  | 'settings';

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'ACOMPTE' | 'CREDIT' | 'CARD' | 'TRANSFER';

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

export type ExpenseCategory =
  | 'TRANSPORT'
  | 'LOYER'
  | 'FACTURES'
  | 'SALAIRES'
  | 'EMBALLAGE'
  | 'REPAS_DEPLACEMENT'
  | 'TAXES'
  | 'ACHAT_STOCK'
  | 'AUTRE';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number; // Montant en FCFA
  paymentMethod: PaymentMethod;
  recordedBy: string; // Utilisateur ayant saisi la charge
  storeName?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseBatch {
  id: string;
  date: string; // YYYY-MM-DD
  productId?: string;
  productSku?: string;
  productName: string;
  quantityBought: number; // Nombre de produits payés
  purchasePriceTotal: number; // Prix total d'achat des marchandises
  unitPurchasePrice: number; // Prix d'achat unitaire brut (hors transport)
  shippingCost: number; // Frais de transport & acheminement vers destination
  unitShippingCost: number; // Part de transport par article
  unitCostPrice: number; // Prix de revient unitaire = (Achat + Transport) / Quantité
  totalCostPaid: number; // Total décaissé = Achat + Transport
  supplierName?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}


