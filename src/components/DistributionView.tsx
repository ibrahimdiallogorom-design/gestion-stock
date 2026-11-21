import React, { useState, useMemo } from 'react';
import {
  Building2,
  Store,
  Share2,
  TrendingUp,
  Package,
  Boxes,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  UserCheck,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product, AppUser } from '../types';

export const DistributionView: React.FC = () => {
  const {
    products,
    appUsers,
    activeAppUser,
    movements,
    openDistributionModal,
    openDirectSaleModal,
    setBoutiqueQuantity,
    setBoutiquePricing,
    removeFromBoutique,
    createAppUser,
    deleteAppUser,
    openConfirmModal,
  } = useStock();

  const cashiers = useMemo(() => appUsers.filter((u) => u.role === 'CASHIER'), [appUsers]);

  // Selected store view: 'ALL' (Global) | 'CENTRAL' (Grand Magasin) | cashierId
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    activeAppUser?.role === 'CASHIER' ? activeAppUser.id : 'ALL'
  );
  const [searchFilter, setSearchFilter] = useState('');

  // Inline quantity editing state: { [productId]: number | string }
  const [editingQuantities, setEditingQuantities] = useState<Record<string, number | string>>({});
  // Inline pricing editing state for a boutique: { [productId]: { transfer: string; market: string } }
  const [editingPrices, setEditingPrices] = useState<Record<string, { transfer: string; market: string }>>({});
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New boutique modal state
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSeller, setNewStoreSeller] = useState('');
  const [newStoreUsername, setNewStoreUsername] = useState('');
  const [newStorePassword, setNewStorePassword] = useState('');
  const [storeFormError, setStoreFormError] = useState<string | null>(null);

  // 1. Overall Company Financials (Global Enterprise)
  const globalFinancials = useMemo(() => {
    let totalUnits = 0;
    let totalCost = 0;
    let totalSale = 0;

    let centralUnits = 0;
    let centralCost = 0;
    let centralSale = 0;

    let distributedUnits = 0;
    let distributedCost = 0;
    let distributedTransfer = 0;
    let distributedSale = 0;
    let distributedCashierProfit = 0;

    products.forEach((p) => {
      const cQty = p.quantity;
      const dMap = p.distributedQuantities || {};

      totalUnits += cQty;
      totalCost += cQty * p.costPrice;
      totalSale += cQty * p.salePrice;

      centralUnits += cQty;
      centralCost += cQty * p.costPrice;
      centralSale += cQty * p.salePrice;

      cashiers.forEach((c) => {
        const q = Number(dMap[c.id]) || 0;
        if (q > 0) {
          const tPrice = p.distributedTransferPrices?.[c.id] ?? p.cashierTransferPrice ?? p.salePrice;
          const mPrice = p.distributedMarketPrices?.[c.id] ?? p.salePrice;
          distributedUnits += q;
          distributedCost += q * p.costPrice;
          distributedTransfer += q * tPrice;
          distributedSale += q * mPrice;
          distributedCashierProfit += q * (mPrice - tPrice);
        }
      });
    });

    return {
      totalUnits,
      totalCost,
      totalSale,
      centralUnits,
      centralCost,
      centralSale,
      distributedUnits,
      distributedCost,
      distributedTransfer,
      distributedSale,
      distributedCashierProfit,
    };
  }, [products, cashiers]);

  // 2. Breakdown per Cashier / Sub-Boutique
  const storesData = useMemo(() => {
    return cashiers.map((cashier) => {
      let unitsHeld = 0;
      let costHeld = 0;
      let transferHeld = 0;
      let saleHeld = 0;
      let cashierProfitHeld = 0;
      const productLines: {
        product: Product;
        quantity: number;
        transferPriceUnit: number;
        marketPriceUnit: number;
        cashierProfitUnit: number;
        costSubtotal: number;
        transferSubtotal: number;
        saleSubtotal: number;
        cashierProfitSubtotal: number;
      }[] = [];

      products.forEach((p) => {
        const qty = p.distributedQuantities?.[cashier.id] || 0;
        if (qty > 0) {
          const transferPriceUnit =
            p.distributedTransferPrices?.[cashier.id] ?? p.cashierTransferPrice ?? p.salePrice;
          const marketPriceUnit =
            p.distributedMarketPrices?.[cashier.id] ?? p.salePrice;
          const cashierProfitUnit = marketPriceUnit - transferPriceUnit;

          unitsHeld += qty;
          const costSub = qty * p.costPrice;
          const transferSub = qty * transferPriceUnit;
          const saleSub = qty * marketPriceUnit;
          const profitSub = qty * cashierProfitUnit;

          costHeld += costSub;
          transferHeld += transferSub;
          saleHeld += saleSub;
          cashierProfitHeld += profitSub;

          productLines.push({
            product: p,
            quantity: qty,
            transferPriceUnit,
            marketPriceUnit,
            cashierProfitUnit,
            costSubtotal: costSub,
            transferSubtotal: transferSub,
            saleSubtotal: saleSub,
            cashierProfitSubtotal: profitSub,
          });
        }
      });

      return {
        cashier,
        unitsHeld,
        costHeld,
        transferHeld,
        saleHeld,
        cashierProfitHeld,
        productLines,
        articlesCount: productLines.length,
      };
    });
  }, [cashiers, products]);

  // 3. Products in Grand Magasin Central
  const centralProducts = useMemo(() => {
    return products
      .map((p) => {
        const cQty = p.quantity;
        const transferPriceUnit = p.cashierTransferPrice ?? p.salePrice;
        const marketPriceUnit = p.salePrice;
        const cashierProfitUnit = marketPriceUnit - transferPriceUnit;
        return {
          product: p,
          quantity: cQty,
          transferPriceUnit,
          marketPriceUnit,
          cashierProfitUnit,
          costSubtotal: cQty * p.costPrice,
          transferSubtotal: cQty * transferPriceUnit,
          saleSubtotal: cQty * marketPriceUnit,
          cashierProfitSubtotal: cQty * cashierProfitUnit,
        };
      })
      .filter((line) => line.quantity > 0);
  }, [products]);

  // Filtered product lines based on current selected store
  const activeStoreDetail = useMemo(() => {
    if (selectedStoreId === 'CENTRAL') {
      return {
        name: 'Grand Magasin Central (Dépôt Principal & Grossiste)',
        storeSubtitle: 'Stock central prêt à être vendu en gros, au détail ou distribué aux caisses',
        units: globalFinancials.centralUnits,
        cost: globalFinancials.centralCost,
        transfer: globalFinancials.centralSale,
        sale: globalFinancials.centralSale,
        cashierProfit: 0,
        lines: centralProducts,
      };
    }

    const found = storesData.find((s) => s.cashier.id === selectedStoreId);
    if (found) {
      return {
        name: found.cashier.fullName,
        storeSubtitle: found.cashier.storeName || `Sous-boutique ${found.cashier.username}`,
        units: found.unitsHeld,
        cost: found.costHeld,
        transfer: found.transferHeld,
        sale: found.saleHeld,
        cashierProfit: found.cashierProfitHeld,
        lines: found.productLines,
        cashier: found.cashier,
      };
    }

    return null;
  }, [selectedStoreId, globalFinancials, centralProducts, storesData]);

  // Recent Transfer movements
  const transferHistory = useMemo(() => {
    return movements
      .filter((m) => m.type === 'TRANSFER' || m.type === 'RETURN')
      .slice(0, 8);
  }, [movements]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Architecture Multi-Boutiques
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Grand Magasin & Caisses Vendeurs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez le stock central du Grand Magasin, distribuez les marchandises à chaque vendeur et contrôlez la valeur financière exacte de chaque sous-boutique.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openDirectSaleModal()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Vendre du Grand Magasin</span>
          </button>

          <button
            onClick={() => {
              const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
              let randomCode = 'VT-';
              for (let i = 0; i < 5; i++) {
                randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              setNewStoreName('');
              setNewStoreSeller('');
              setNewStoreUsername('');
              setNewStorePassword(randomCode);
              setStoreFormError(null);
              setIsCreateStoreModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une Boutique</span>
          </button>

          <button
            onClick={() => openDistributionModal()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Share2 className="w-4 h-4" />
            <span>Distribuer un Produit</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between font-semibold shadow-xs transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 Executive Financial Valuation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: TOTAL BOUTIQUE GLOBALE */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <span>Valeur Totale Globale (Toute l'Entreprise)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold font-mono tracking-tight">
                {Math.round(globalFinancials.totalSale).toLocaleString('fr-FR')} FCFA
              </span>
              <p className="text-xs text-blue-200/70 mt-1">
                Valeur marchande globale (Grand Magasin + Tous les vendeurs)
              </p>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-blue-900/60 flex items-center justify-between text-xs text-blue-200 font-mono">
            <span>Coût d'achat global :</span>
            <span className="font-bold text-white">
              {Math.round(globalFinancials.totalCost).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Card 2: GRAND MAGASIN CENTRAL */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-blue-700">
                <Building2 className="w-4 h-4 text-blue-600" />
                Grand Magasin Central (Dépôt)
              </span>
              <span className="font-mono text-xs font-bold text-slate-600">
                {globalFinancials.centralUnits} pièces
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {Math.round(globalFinancials.centralSale).toLocaleString('fr-FR')} FCFA
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Stock restant au dépôt central
              </p>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>Coût d'achat dépôt :</span>
            <span className="font-semibold text-slate-900">
              {Math.round(globalFinancials.centralCost).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Card 3: STOCK DISTRIBUÉ AUX VENDEURS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-indigo-700">
                <Store className="w-4 h-4 text-indigo-600" />
                Stock en Caisses / Vendeurs
              </span>
              <span className="font-mono text-xs font-bold text-indigo-600">
                {globalFinancials.distributedUnits} pièces
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold font-mono text-indigo-900">
                {Math.round(globalFinancials.distributedSale).toLocaleString('fr-FR')} FCFA
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Valeur finale marché chez les {cashiers.length} vendeurs & sous-boutiques
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-600">
              <span>Dû Boutique Principale :</span>
              <span className="font-bold text-blue-700">
                {Math.round(globalFinancials.distributedTransfer).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-700 font-bold">
              <span>Bénéfice prévu Caissiers :</span>
              <span>
                +{Math.round(globalFinancials.distributedCashierProfit).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedStoreId('ALL')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            selectedStoreId === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Vue d'Ensemble & Comparatif</span>
        </button>

        <button
          onClick={() => setSelectedStoreId('CENTRAL')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            selectedStoreId === 'CENTRAL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Grand Magasin Central ({globalFinancials.centralUnits})</span>
        </button>

        {storesData.map((s) => (
          <button
            key={s.cashier.id}
            onClick={() => setSelectedStoreId(s.cashier.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              selectedStoreId === s.cashier.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>
              {s.cashier.fullName} ({s.unitsHeld} pcs — Marché: {Math.round(s.saleHeld).toLocaleString('fr-FR')} F)
            </span>
          </button>
        ))}
      </div>

      {/* VIEW MODE 1: COMPARATIVE OVERVIEW TABLE */}
      {selectedStoreId === 'ALL' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tableau Comparatif des Boutiques & Caisses (Grossiste & Revendeurs)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparez le montant remis aux caisses (qui revient à la Boutique Principale), la valeur finale sur le marché et le bénéfice de chaque caissier.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Emplacement / Boutique</th>
                  <th className="py-3 px-4">Responsable / Caissier</th>
                  <th className="py-3 px-4 text-center">Références</th>
                  <th className="py-3 px-4 text-center">Quantité Détenue</th>
                  <th className="py-3 px-4 text-right">Coût Achat Fournisseur</th>
                  <th className="py-3 px-4 text-right">Prix Remis Caisse (Dû Magasin)</th>
                  <th className="py-3 px-4 text-right">Valeur Finale Marché</th>
                  <th className="py-3 px-4 text-right">Bénéfice Caissier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Row 1: Grand Magasin */}
                <tr className="hover:bg-blue-50/40 transition-colors bg-blue-50/20 font-medium">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-blue-950">Grand Magasin Central (Grossiste)</span>
                        <p className="text-[10px] text-blue-700">Dépôt principal & Vente en Gros / Détail</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    Gérant / Magasinier Central
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold">
                    {centralProducts.length} articles
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                    {globalFinancials.centralUnits} pièces
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    {Math.round(globalFinancials.centralCost).toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-800">
                    {Math.round(globalFinancials.centralSale).toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-900">
                    {Math.round(globalFinancials.centralSale).toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    —
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openDirectSaleModal()}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Vendre</span>
                      </button>
                      <button
                        onClick={() => setSelectedStoreId('CENTRAL')}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                      >
                        Voir le stock
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Rows for Cashiers */}
                {storesData.map((store) => (
                  <tr key={store.cashier.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">
                            {store.cashier.storeName || `Boutique ${store.cashier.username}`}
                          </span>
                          <p className="text-[10px] text-slate-500">Sous-boutique d'encaissement</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {store.cashier.fullName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                      {store.articlesCount} articles
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                      {store.unitsHeld} pièces
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {Math.round(store.costHeld).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700">
                      {Math.round(store.transferHeld).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-800">
                      {Math.round(store.saleHeld).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {store.cashierProfitHeld >= 0 ? '+' : ''}
                      {Math.round(store.cashierProfitHeld).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStoreId(store.cashier.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Détails & Prix
                        </button>
                        <button
                          onClick={() => openDistributionModal(undefined, store.cashier.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Dotation</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={3} className="py-3.5 px-4 text-sm font-bold">
                    VALEUR TOTALE DE TOUTE LA BOUTIQUE (Ensemble)
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-sm font-bold text-slate-900">
                    {globalFinancials.totalUnits} pièces
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-slate-700">
                    {Math.round(globalFinancials.totalCost).toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-blue-800">
                    {Math.round(globalFinancials.distributedTransfer).toLocaleString('fr-FR')} F (Caisses)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-base font-bold text-blue-900">
                    {Math.round(globalFinancials.totalSale).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm font-bold text-emerald-700">
                    +{Math.round(globalFinancials.distributedCashierProfit).toLocaleString('fr-FR')} F
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SPECIFIC STORE INVENTORY DETAIL */}
      {activeStoreDetail && (
        <div className="space-y-6">
          {/* Active Store Value Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Fiche de Stock & Tarification
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{activeStoreDetail.storeSubtitle}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {activeStoreDetail.name}
              </h2>
            </div>

            {/* Total Financial Values for this store */}
            <div className="flex flex-wrap items-center gap-5 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Articles Détenus</span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {activeStoreDetail.units} <span className="text-xs font-normal text-slate-500">pièces</span>
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-[11px] text-blue-800 font-bold block">Dû Boutique Principale (Prix Caisse)</span>
                <span className="text-lg font-bold font-mono text-blue-700">
                  {Math.round(activeStoreDetail.transfer).toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-[11px] text-slate-800 font-bold block">Valeur Finale sur le Marché</span>
                <span className="text-xl font-extrabold font-mono text-slate-900">
                  {Math.round(activeStoreDetail.sale).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              {activeStoreDetail.cashier && (
                <>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div>
                    <span className="text-[11px] text-emerald-800 font-bold block">Bénéfice Total Caissier</span>
                    <span className="text-xl font-extrabold font-mono text-emerald-700">
                      {activeStoreDetail.cashierProfit >= 0 ? '+' : ''}
                      {Math.round(activeStoreDetail.cashierProfit).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* List of articles received & held */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Articles Reçus et Grille des Prix ({activeStoreDetail.lines.length})
                </h3>
                {activeStoreDetail.cashier && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Vous pouvez ajuster directement le <strong>Prix Remis Caisse</strong> (ex: 4 000 F) et le <strong>Prix Final Marché</strong> (ex: 4 500 F) pour calculer le bénéfice du caissier.
                  </p>
                )}
              </div>
              {activeStoreDetail.cashier && (
                <button
                  onClick={() => openDistributionModal(undefined, activeStoreDetail.cashier?.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Octroyer d'autres articles à cette caisse</span>
                </button>
              )}
            </div>

            {activeStoreDetail.lines.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-medium">
                  Aucun article n'a encore été attribué à ce point de vente.
                </p>
                {activeStoreDetail.cashier && (
                  <button
                    onClick={() => openDistributionModal(undefined, activeStoreDetail.cashier?.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Effectuer la première dotation</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                      <th className="py-3 px-3">SKU & Article</th>
                      <th className="py-3 px-3 text-center">Quantité</th>
                      <th className="py-3 px-3 text-right">Prix Achat</th>
                      {!activeStoreDetail.cashier && <th className="py-3 px-3 text-right">Prix en Gros</th>}
                      <th className="py-3 px-3 text-right">Prix Remis Caisse</th>
                      <th className="py-3 px-3 text-right">Prix Final Marché</th>
                      <th className="py-3 px-3 text-right">Bénéfice Caissier / u</th>
                      <th className="py-3 px-3 text-right">Total Dû Magasin</th>
                      <th className="py-3 px-3 text-right">Total Marché</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeStoreDetail.lines.map((item) => {
                      const priceEditState = editingPrices[item.product.id];
                      const currentTransferEdit =
                        priceEditState !== undefined ? priceEditState.transfer : String(item.transferPriceUnit);
                      const currentMarketEdit =
                        priceEditState !== undefined ? priceEditState.market : String(item.marketPriceUnit);
                      const isPriceDirty =
                        priceEditState !== undefined &&
                        ((parseInt(priceEditState.transfer, 10) || 0) !== item.transferPriceUnit ||
                          (parseInt(priceEditState.market, 10) || 0) !== item.marketPriceUnit);

                      const previewProfitUnit =
                        (parseInt(currentMarketEdit, 10) || 0) - (parseInt(currentTransferEdit, 10) || 0);

                      return (
                        <tr key={item.product.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{item.product.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {item.product.sku} · {item.product.category}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {activeStoreDetail.cashier ? (
                              <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rawVal = editingQuantities[item.product.id];
                                    const current = rawVal !== undefined
                                      ? (typeof rawVal === 'string' ? (parseInt(rawVal, 10) || 0) : rawVal)
                                      : item.quantity;
                                    if (current > 0) {
                                      setEditingQuantities((prev) => ({ ...prev, [item.product.id]: current - 1 }));
                                    }
                                  }}
                                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs transition-colors"
                                  title="Diminuer la quantité"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                  value={editingQuantities[item.product.id] !== undefined ? editingQuantities[item.product.id] : item.quantity}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '') {
                                      setEditingQuantities((prev) => ({ ...prev, [item.product.id]: '' }));
                                    } else {
                                      const clean = raw.replace(/[^0-9]/g, '');
                                      setEditingQuantities((prev) => ({
                                        ...prev,
                                        [item.product.id]: clean === '' ? '' : parseInt(clean, 10),
                                      }));
                                    }
                                  }}
                                  className="w-12 text-center font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded py-0.5 text-xs focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rawVal = editingQuantities[item.product.id];
                                    const current = rawVal !== undefined
                                      ? (typeof rawVal === 'string' ? (parseInt(rawVal, 10) || 0) : rawVal)
                                      : item.quantity;
                                    setEditingQuantities((prev) => ({ ...prev, [item.product.id]: current + 1 }));
                                  }}
                                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs transition-colors"
                                  title="Augmenter la quantité"
                                >
                                  +
                                </button>

                                {editingQuantities[item.product.id] !== undefined &&
                                 (typeof editingQuantities[item.product.id] === 'string'
                                   ? (parseInt(editingQuantities[item.product.id] as string, 10) || 0) !== item.quantity
                                   : editingQuantities[item.product.id] !== item.quantity) && (
                                  <button
                                    type="button"
                                    disabled={updatingProductId === item.product.id}
                                    onClick={async () => {
                                      const rawVal = editingQuantities[item.product.id];
                                      const targetQty = typeof rawVal === 'string' ? (parseInt(rawVal, 10) || 0) : (rawVal || 0);
                                      setUpdatingProductId(item.product.id);
                                      const res = await setBoutiqueQuantity(
                                        item.product.id,
                                        activeStoreDetail.cashier!.id,
                                        targetQty
                                      );
                                      setUpdatingProductId(null);
                                      if (res.success) {
                                        setEditingQuantities((prev) => {
                                          const next = { ...prev };
                                          delete next[item.product.id];
                                          return next;
                                        });
                                        setToastMessage({
                                          type: 'success',
                                          text: `Quantité confirmée : ${targetQty} pièce(s) pour "${item.product.name}".`,
                                        });
                                        setTimeout(() => setToastMessage(null), 3500);
                                      } else {
                                        setToastMessage({ type: 'error', text: res.message });
                                        setTimeout(() => setToastMessage(null), 4000);
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] flex items-center gap-0.5 shadow-2xs transition-colors ml-0.5"
                                    title="Confirmer la modification de quantité"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-900 text-sm">{item.quantity}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {item.product.costPrice.toLocaleString('fr-FR')} F
                          </td>
                          {!activeStoreDetail.cashier && (
                            <td className="py-3 px-3 text-right font-mono font-semibold text-indigo-700">
                              {item.product.wholesalePrice && item.product.wholesalePrice > 0
                                ? `${item.product.wholesalePrice.toLocaleString('fr-FR')} F`
                                : '—'}
                            </td>
                          )}
                          {/* Prix Remis Caisse */}
                          <td className="py-3 px-3 text-right">
                            {activeStoreDetail.cashier ? (
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={currentTransferEdit}
                                onChange={(e) =>
                                  setEditingPrices((prev) => ({
                                    ...prev,
                                    [item.product.id]: {
                                      transfer: e.target.value,
                                      market: currentMarketEdit,
                                    },
                                  }))
                                }
                                className="w-20 text-right font-mono font-bold text-blue-800 bg-blue-50/60 border border-blue-200 rounded-lg px-2 py-1 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                              />
                            ) : (
                              <span className="font-mono font-semibold text-blue-700">
                                {item.transferPriceUnit.toLocaleString('fr-FR')} F
                              </span>
                            )}
                          </td>
                          {/* Prix Final Marché */}
                          <td className="py-3 px-3 text-right">
                            {activeStoreDetail.cashier ? (
                              <div className="inline-flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  value={currentMarketEdit}
                                  onChange={(e) =>
                                    setEditingPrices((prev) => ({
                                      ...prev,
                                      [item.product.id]: {
                                        transfer: currentTransferEdit,
                                        market: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-20 text-right font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-600"
                                />
                                {isPriceDirty && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const tVal = parseInt(currentTransferEdit, 10) || 0;
                                      const mVal = parseInt(currentMarketEdit, 10) || 0;
                                      const res = await setBoutiquePricing(
                                        item.product.id,
                                        activeStoreDetail.cashier!.id,
                                        tVal,
                                        mVal
                                      );
                                      if (res.success) {
                                        setEditingPrices((prev) => {
                                          const next = { ...prev };
                                          delete next[item.product.id];
                                          return next;
                                        });
                                        setToastMessage({ type: 'success', text: res.message });
                                        setTimeout(() => setToastMessage(null), 4000);
                                      } else {
                                        setToastMessage({ type: 'error', text: res.message });
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-0.5 shadow-2xs"
                                    title="Enregistrer le prix remis caisse et le prix final marché"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>OK</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-900">
                                {item.marketPriceUnit.toLocaleString('fr-FR')} F
                              </span>
                            )}
                          </td>
                          {/* Bénéfice Caissier / u */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            {previewProfitUnit >= 0 ? '+' : ''}
                            {previewProfitUnit.toLocaleString('fr-FR')} F
                          </td>
                          {/* Total Dû Magasin */}
                          <td className="py-3 px-3 text-right font-mono font-semibold text-blue-800">
                            {Math.round(item.transferSubtotal).toLocaleString('fr-FR')} F
                          </td>
                          {/* Total Marché */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                            {Math.round(item.saleSubtotal).toLocaleString('fr-FR')} F
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {activeStoreDetail.cashier && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    openConfirmModal(
                                      'Supprimer cet article de la boutique ?',
                                      `Voulez-vous retirer "${item.product.name}" de la boutique "${activeStoreDetail.name}" ? L'intégralité du stock (${item.quantity} pièce(s)) sera immédiatement rapatriée au Grand Magasin Central.`,
                                      async () => {
                                        const res = await removeFromBoutique(
                                          item.product.id,
                                          activeStoreDetail.cashier!.id
                                        );
                                        if (res.success) {
                                          setToastMessage({ type: 'success', text: res.message });
                                          setTimeout(() => setToastMessage(null), 3500);
                                        } else {
                                          setToastMessage({ type: 'error', text: res.message });
                                          setTimeout(() => setToastMessage(null), 4000);
                                        }
                                      },
                                      true,
                                      'Confirmer la suppression'
                                    );
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                                  title="Supprimer cet article de la boutique"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openDirectSaleModal(item.product.id)}
                                disabled={item.product.quantity <= 0}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                title="Vendre directement cet article depuis le Grand Magasin"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Vendre</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openDistributionModal(item.product.id, activeStoreDetail.cashier?.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Octroyer du stock ou modifier les prix via le modal"
                              >
                                Dotation
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <td className="py-3 px-3">
                        TOTAL DE CETTE BOUTIQUE
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {activeStoreDetail.units} pièces
                      </td>
                      <td colSpan={activeStoreDetail.cashier ? 4 : 5}></td>
                      <td className="py-3 px-3 text-right font-mono text-blue-800">
                        {Math.round(activeStoreDetail.transfer).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 text-sm">
                        {Math.round(activeStoreDetail.sale).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer Movement History */}
      {transferHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">
              Derniers Transferts de Marchandises (Grand Magasin ⬌ Caissiers)
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {transferHistory.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      m.type === 'TRANSFER'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {m.type === 'TRANSFER' ? <Share2 className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">
                      {m.productName} ({m.productSku})
                    </span>
                    <p className="text-slate-500 text-[11px]">{m.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span
                      className={`font-mono font-bold ${
                        m.type === 'TRANSFER' ? 'text-blue-700' : 'text-amber-700'
                      }`}
                    >
                      {Math.abs(m.quantityDelta)} unité(s)
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString('fr-FR')} à {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Créer une Nouvelle Boutique (Sécurisé Anti-Intrusion) */}
      {isCreateStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Créer une Boutique Sécurisée</h3>
                  <p className="text-xs text-blue-200/80">Ajouter un point de vente avec identifiants protégés</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateStoreModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStoreFormError(null);
                if (!newStoreName.trim()) {
                  setStoreFormError('Veuillez saisir le nom de la boutique.');
                  return;
                }
                if (!newStoreUsername.trim() || newStoreUsername.trim().length < 3) {
                  setStoreFormError('Veuillez saisir un identifiant d’au moins 3 caractères.');
                  return;
                }
                const cleanPass = newStorePassword.trim();
                if (!cleanPass || cleanPass.length < 4) {
                  setStoreFormError('Veuillez définir un mot de passe d’au moins 4 caractères.');
                  return;
                }
                const forbiddenWeakPasswords = ['1234', '0000', '1111', 'admin', 'password', 'azerty'];
                if (forbiddenWeakPasswords.includes(cleanPass.toLowerCase())) {
                  setStoreFormError(
                    'Sécurité SaaS : Ce mot de passe (ex: 1234 ou 0000) est trop facile à deviner. Utilisez le bouton "Générer un code fort" ou choisissez un code secret.'
                  );
                  return;
                }

                const res = createAppUser({
                  storeName: newStoreName.trim(),
                  fullName: newStoreSeller.trim() || newStoreUsername.trim(),
                  username: newStoreUsername.trim(),
                  password: cleanPass,
                  role: 'CASHIER',
                });

                if (res.success) {
                  setIsCreateStoreModalOpen(false);
                  setToastMessage({
                    type: 'success',
                    text: `La boutique "${newStoreName.trim()}" (@${newStoreUsername.trim()}) a été créée avec succès et protégée !`,
                  });
                  setTimeout(() => setToastMessage(null), 5000);
                } else {
                  setStoreFormError(res.message || 'Erreur lors de la création de la boutique.');
                }
              }}
              className="p-5 space-y-4 text-xs"
            >
              {storeFormError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                  {storeFormError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom de la Boutique / Emplacement *
                </label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="Ex: Boutique Moussa Vision - Caisse 2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom du Vendeur / Responsable *
                </label>
                <input
                  type="text"
                  required
                  value={newStoreSeller}
                  onChange={(e) => setNewStoreSeller(e.target.value)}
                  placeholder="Ex: Moussa Vendeur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Identifiant de connexion caissier *
                </label>
                <input
                  type="text"
                  required
                  value={newStoreUsername}
                  onChange={(e) => setNewStoreUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                  placeholder="Ex: moussavision2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Mot de passe / Code secret de caisse *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                      let code = 'VT-';
                      for (let i = 0; i < 5; i++) {
                        code += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setNewStorePassword(code);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    🔑 Générer un code fort
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newStorePassword}
                  onChange={(e) => setNewStorePassword(e.target.value)}
                  placeholder="Ex: VT-8K4M9 (évitez 1234)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  🛡️ Sécurité SaaS : Les codes triviaux (1234, 0000) sont refusés pour protéger le stock de la boutique.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateStoreModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer la création</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
