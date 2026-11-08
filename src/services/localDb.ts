import Dexie, { type Table } from 'dexie';
import {
  Product,
  StockMovement,
  Expense,
  PurchaseBatch,
  VisitorSurvey,
  AppUser,
} from '../types';

export interface ProduitOfflineRow extends Product {
  nom: string;
  categorie: string;
  prix: number;
}

export interface CommandeOfflineRow {
  id?: number;
  details: unknown;
  timestamp: number;
}

export interface KeyValueRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

// Initialisation de la base de données locale
export class VisionTechOfflineDB extends Dexie {
  produits!: Table<ProduitOfflineRow, string>;
  commandesOffline!: Table<CommandeOfflineRow, number>;
  products!: Table<Product, string>;
  movements!: Table<StockMovement, string>;
  expenses!: Table<Expense, string>;
  purchases!: Table<PurchaseBatch, string>;
  surveys!: Table<VisitorSurvey, string>;
  appUsers!: Table<AppUser, string>;
  kvStore!: Table<KeyValueRecord, string>;

  constructor() {
    super('VisionTechOfflineDB');

    this.version(1).stores({
      // Table des produits : indexée sur 'id' (clé primaire), 'nom', 'categorie', 'prix'
      produits: 'id, nom, categorie, prix',

      // Table des commandes créées hors-ligne en attente de synchronisation
      commandesOffline: '++id, details, timestamp',

      // Tables complètes de l'application StockFlow
      products: 'id, sku, name, category, lastUpdated',
      movements: 'id, productId, type, ticketNumber, createdAt',
      expenses: 'id, date, category, createdAt',
      purchases: 'id, date, productId, createdAt',
      surveys: 'id, date, reason, createdAt',
      appUsers: 'id, username, role',
      kvStore: 'key, updatedAt',
    });
  }
}

export const db = new VisionTechOfflineDB();
export const localDb = db;

// Expose Dexie et db sur window pour accès global hors-ligne
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Dexie = Dexie;
  (window as unknown as Record<string, unknown>).db = db;
  (window as unknown as Record<string, unknown>).localDb = db;
}

/**
 * Ajoute une commande ou opération créée hors-ligne dans la table `commandesOffline`
 * en attente de synchronisation avec la boutique centrale.
 */
export async function addCommandeOffline(details: unknown): Promise<void> {
  try {
    await db.commandesOffline.add({
      details,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[VisionTechOfflineDB] Avertissement ajout commandesOffline :', err);
  }
}

/**
 * Récupère toutes les commandes hors-ligne en attente dans `commandesOffline`.
 */
export async function getPendingCommandesOffline(): Promise<CommandeOfflineRow[]> {
  try {
    return await db.commandesOffline.orderBy('timestamp').toArray();
  } catch (err) {
    return [];
  }
}

/**
 * Vide la table `commandesOffline` une fois la synchronisation Cloud terminée.
 */
export async function clearCommandesOffline(): Promise<void> {
  try {
    await db.commandesOffline.clear();
  } catch (err) {
    console.warn('[VisionTechOfflineDB] Avertissement purge commandesOffline :', err);
  }
}

/**
 * Synchronise l'état de l'application dans `VisionTechOfflineDB` (incluant la table `produits`).
 */
export async function syncStateToDexie(data: {
  products?: Product[];
  movements?: StockMovement[];
  expenses?: Expense[];
  purchases?: PurchaseBatch[];
  surveys?: VisitorSurvey[];
  appUsers?: AppUser[];
  activeUser?: AppUser | null;
}): Promise<void> {
  try {
    const now = new Date().toISOString();
    await db.transaction(
      'rw',
      [
        db.produits,
        db.products,
        db.movements,
        db.expenses,
        db.purchases,
        db.surveys,
        db.appUsers,
        db.kvStore,
      ],
      async () => {
        if (data.products) {
          await db.products.clear();
          await db.produits.clear();
          if (data.products.length > 0) {
            await db.products.bulkPut(data.products);
            const mappedProduits: ProduitOfflineRow[] = data.products.map((p) => ({
              ...p,
              nom: p.name,
              categorie: p.category,
              prix: p.salePrice,
            }));
            await db.produits.bulkPut(mappedProduits);
          }
        }
        if (data.movements) {
          await db.movements.clear();
          if (data.movements.length > 0) {
            await db.movements.bulkPut(data.movements);
          }
        }
        if (data.expenses) {
          await db.expenses.clear();
          if (data.expenses.length > 0) {
            await db.expenses.bulkPut(data.expenses);
          }
        }
        if (data.purchases) {
          await db.purchases.clear();
          if (data.purchases.length > 0) {
            await db.purchases.bulkPut(data.purchases);
          }
        }
        if (data.surveys) {
          await db.surveys.clear();
          if (data.surveys.length > 0) {
            await db.surveys.bulkPut(data.surveys);
          }
        }
        if (data.appUsers) {
          await db.appUsers.clear();
          if (data.appUsers.length > 0) {
            await db.appUsers.bulkPut(data.appUsers);
          }
        }
        if (data.activeUser !== undefined) {
          await db.kvStore.put({
            key: 'activeAppUser',
            value: data.activeUser,
            updatedAt: now,
          });
        }
      }
    );
  } catch (err) {
    console.warn('[VisionTechOfflineDB] Avertissement sauvegarde locale :', err);
  }
}

/**
 * Charge l'état complet depuis `VisionTechOfflineDB` au démarrage hors-ligne.
 */
export async function loadStateFromDexie(): Promise<{
  products: Product[];
  movements: StockMovement[];
  expenses: Expense[];
  purchases: PurchaseBatch[];
  surveys: VisitorSurvey[];
  appUsers: AppUser[];
  activeUser: AppUser | null | undefined;
} | null> {
  try {
    const [products, movements, expenses, purchases, surveys, appUsers, activeUserRec] =
      await Promise.all([
        db.products.toArray(),
        db.movements.orderBy('createdAt').reverse().toArray(),
        db.expenses.orderBy('createdAt').reverse().toArray(),
        db.purchases.orderBy('createdAt').reverse().toArray(),
        db.surveys.orderBy('createdAt').reverse().toArray(),
        db.appUsers.toArray(),
        db.kvStore.get('activeAppUser'),
      ]);

    return {
      products,
      movements,
      expenses,
      purchases,
      surveys,
      appUsers,
      activeUser: activeUserRec ? (activeUserRec.value as AppUser | null) : undefined,
    };
  } catch (err) {
    console.warn('[VisionTechOfflineDB] Avertissement lecture locale :', err);
    return null;
  }
}
