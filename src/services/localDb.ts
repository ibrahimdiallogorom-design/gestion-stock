import Dexie, { type Table } from 'dexie';
import {
  Product,
  StockMovement,
  Expense,
  PurchaseBatch,
  VisitorSurvey,
  AppUser,
} from '../types';

export interface KeyValueRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export class VisionTechLocalDB extends Dexie {
  products!: Table<Product, string>;
  movements!: Table<StockMovement, string>;
  expenses!: Table<Expense, string>;
  purchases!: Table<PurchaseBatch, string>;
  surveys!: Table<VisitorSurvey, string>;
  appUsers!: Table<AppUser, string>;
  kvStore!: Table<KeyValueRecord, string>;

  constructor() {
    super('VisionTechStockFlowDB');
    this.version(1).stores({
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

export const localDb = new VisionTechLocalDB();

// Expose Dexie et la base locale sur window pour compatibilité script direct & inspection hors-ligne
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Dexie = Dexie;
  (window as unknown as Record<string, unknown>).localDb = localDb;
}

/**
 * Sauvegarde asynchrone non-bloquante dans IndexedDB (Dexie.js).
 * Permet de stocker des milliers de produits avec photos HD, ventes et sondages 100% hors-ligne
 * sans être limité par la taille de localStorage (5 Mo).
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
    await localDb.transaction(
      'rw',
      [
        localDb.products,
        localDb.movements,
        localDb.expenses,
        localDb.purchases,
        localDb.surveys,
        localDb.appUsers,
        localDb.kvStore,
      ],
      async () => {
        if (data.products) {
          await localDb.products.clear();
          if (data.products.length > 0) {
            await localDb.products.bulkPut(data.products);
          }
        }
        if (data.movements) {
          await localDb.movements.clear();
          if (data.movements.length > 0) {
            await localDb.movements.bulkPut(data.movements);
          }
        }
        if (data.expenses) {
          await localDb.expenses.clear();
          if (data.expenses.length > 0) {
            await localDb.expenses.bulkPut(data.expenses);
          }
        }
        if (data.purchases) {
          await localDb.purchases.clear();
          if (data.purchases.length > 0) {
            await localDb.purchases.bulkPut(data.purchases);
          }
        }
        if (data.surveys) {
          await localDb.surveys.clear();
          if (data.surveys.length > 0) {
            await localDb.surveys.bulkPut(data.surveys);
          }
        }
        if (data.appUsers) {
          await localDb.appUsers.clear();
          if (data.appUsers.length > 0) {
            await localDb.appUsers.bulkPut(data.appUsers);
          }
        }
        if (data.activeUser !== undefined) {
          await localDb.kvStore.put({
            key: 'activeAppUser',
            value: data.activeUser,
            updatedAt: now,
          });
        }
      }
    );
  } catch (err) {
    console.warn('[Dexie LocalDB] Avertissement sauvegarde locale :', err);
  }
}

/**
 * Charge toutes les données depuis IndexedDB (Dexie.js) au démarrage
 * pour restaurer automatiquement la boutique si le cache/localStorage a été vidé
 * ou si les photos produits dépassaient le quota de localStorage.
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
        localDb.products.toArray(),
        localDb.movements.orderBy('createdAt').reverse().toArray(),
        localDb.expenses.orderBy('createdAt').reverse().toArray(),
        localDb.purchases.orderBy('createdAt').reverse().toArray(),
        localDb.surveys.orderBy('createdAt').reverse().toArray(),
        localDb.appUsers.toArray(),
        localDb.kvStore.get('activeAppUser'),
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
    console.warn('[Dexie LocalDB] Avertissement lecture locale :', err);
    return null;
  }
}
