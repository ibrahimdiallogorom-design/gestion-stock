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
  | 'accounting'
  | 'surveys'
  | 'catalog'
  | 'movements'
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

export type NonPurchaseReason =
  | 'PRICE_TOO_HIGH' // Prix jugé trop cher / Hors budget
  | 'QUALITY_CONCERN' // Qualité / Finition / Ne correspond pas aux attentes
  | 'OUT_OF_STOCK' // Rupture de stock / Modèle ou taille non disponible
  | 'JUST_LOOKING' // Simple visiteur / Renseignement / En réflexion
  | 'PAYMENT_METHOD' // Problème moyen de paiement (Orange Money, Wave, pas de monnaie, etc.)
  | 'OTHER'; // Autre raison spécifiée

export const NON_PURCHASE_REASON_LABELS: Record<NonPurchaseReason, { label: string; icon: string; description: string }> = {
  PRICE_TOO_HIGH: {
    label: 'Prix trop élevé',
    icon: '💰',
    description: 'Le client trouve le prix trop cher ou a un budget inférieur',
  },
  QUALITY_CONCERN: {
    label: 'Qualité / Modèle non adapté',
    icon: '💎',
    description: 'La qualité, taille, couleur ou matière ne convient pas',
  },
  OUT_OF_STOCK: {
    label: 'Rupture de stock / Article absent',
    icon: '📦',
    description: "Le produit ou la variante recherchée n'est pas disponible",
  },
  JUST_LOOKING: {
    label: 'Simple visite / Réflexion',
    icon: '👀',
    description: 'Venu se renseigner, comparer ou réfléchir avant achat',
  },
  PAYMENT_METHOD: {
    label: 'Moyen de paiement refusé',
    icon: '💳',
    description: 'Pas de monnaie, pas de terminal ou compte de paiement indisponible',
  },
  OTHER: {
    label: 'Autre motif',
    icon: '✍️',
    description: 'Autre cause détaillée dans les remarques',
  },
};

export interface VisitorSurvey {
  id: string;
  date: string; // YYYY-MM-DD
  visitorName?: string; // Nom du visiteur / client
  whatsappNumber?: string; // Téléphone / WhatsApp du visiteur
  requestedProduct: string; // Article ou produit recherché
  requestedCategory?: string; // Catégorie du produit
  budgetProposed?: number; // Budget espéré par le client (FCFA)
  actualPrice?: number; // Prix proposé en boutique (FCFA)
  reason: NonPurchaseReason; // Motif principal de non-achat
  reasonDetails?: string; // Détails / explications du motif
  recordedBy: string; // Caissier ou gérant ayant accueilli le visiteur
  storeName?: string; // Nom de la boutique (ex: Boutique Moussa Vision)
  contactedForPromo?: boolean; // Marqué si contacté pour une promo ultérieure
  promoNotes?: string; // Historique de relance
  createdAt: string; // Horodatage ISO
}



