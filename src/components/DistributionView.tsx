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
  } = useStock();

  const cashiers = useMemo(() => appUsers.filter((u) => u.role === 'CASHIER'), [appUsers]);

  // Selected store view: 'ALL' (Global) | 'CENTRAL' (Grand Magasin) | cashierId
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    activeAppUser?.role === 'CASHIER' ? activeAppUser.id : 'ALL'
  );
  const [searchFilter, setSearchFilter] = useState('');

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
    let distributedSale = 0;

    products.forEach((p) => {
      const cQty = p.centralQuantity !== undefined ? p.centralQuantity : p.quantity;
      const dMap = p.distributedQuantities || {};
      const dQty = Object.values(dMap).reduce((acc, val) => acc + (Number(val) || 0), 0);
      const fullQty = cQty + dQty;

      totalUnits += fullQty;
      totalCost += fullQty * p.costPrice;
      totalSale += fullQty * p.salePrice;

      centralUnits += cQty;
      centralCost += cQty * p.costPrice;
      centralSale += cQty * p.salePrice;

      distributedUnits += dQty;
      distributedCost += dQty * p.costPrice;
      distributedSale += dQty * p.salePrice;
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
      distributedSale,
    };
  }, [products]);

  // 2. Breakdown per Cashier / Sub-Boutique
  const storesData = useMemo(() => {
    return cashiers.map((cashier) => {
      let unitsHeld = 0;
      let costHeld = 0;
      let saleHeld = 0;
      const productLines: { product: Product; quantity: number; costSubtotal: number; saleSubtotal: number }[] = [];

      products.forEach((p) => {
        const qty = p.distributedQuantities?.[cashier.id] || 0;
        if (qty > 0) {
          unitsHeld += qty;
          const costSub = qty * p.costPrice;
          const saleSub = qty * p.salePrice;
          costHeld += costSub;
          saleHeld += saleSub;
          productLines.push({
            product: p,
            quantity: qty,
            costSubtotal: costSub,
            saleSubtotal: saleSub,
          });
        }
      });

      return {
        cashier,
        unitsHeld,
        costHeld,
        saleHeld,
        productLines,
        articlesCount: productLines.length,
      };
    });
  }, [cashiers, products]);

  // 3. Products in Grand Magasin Central
  const centralProducts = useMemo(() => {
    return products
      .map((p) => {
        const cQty = p.centralQuantity !== undefined ? p.centralQuantity : p.quantity;
        return {
          product: p,
          quantity: cQty,
          costSubtotal: cQty * p.costPrice,
          saleSubtotal: cQty * p.salePrice,
        };
      })
      .filter((line) => line.quantity > 0);
  }, [products]);

  // Filtered product lines based on current selected store
  const activeStoreDetail = useMemo(() => {
    if (selectedStoreId === 'CENTRAL') {
      return {
        name: 'Grand Magasin Central (Dépôt Principal)',
        storeSubtitle: 'Stock central prêt à être distribué aux vendeurs',
        units: globalFinancials.centralUnits,
        cost: globalFinancials.centralCost,
        sale: globalFinancials.centralSale,
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
        sale: found.saleHeld,
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => openDistributionModal()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Share2 className="w-4 h-4" />
            <span>Distribuer un Produit</span>
          </button>
        </div>
      </div>

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
                Réparti entre les {cashiers.length} vendeurs & sous-boutiques
              </p>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>Coût d'achat confié :</span>
            <span className="font-semibold text-slate-900">
              {Math.round(globalFinancials.distributedCost).toLocaleString('fr-FR')} FCFA
            </span>
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
              {s.cashier.fullName} ({s.unitsHeld} pièces — {Math.round(s.saleHeld).toLocaleString('fr-FR')} F)
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
                Tableau Comparatif des Boutiques & Caisses
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vue consolidée pour connaître la valeur exacte de chaque boutique et leur part dans l'entreprise.
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
                  <th className="py-3 px-4 text-right">Coût d'Achat (FCFA)</th>
                  <th className="py-3 px-4 text-right">Valeur Marchande (FCFA)</th>
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
                        <span className="font-bold text-blue-950">Grand Magasin Central</span>
                        <p className="text-[10px] text-blue-700">Dépôt principal de stockage</p>
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
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-900">
                    {Math.round(globalFinancials.centralSale).toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedStoreId('CENTRAL')}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                    >
                      Voir le stock
                    </button>
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
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {Math.round(store.costHeld).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-700">
                      {Math.round(store.saleHeld).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStoreId(store.cashier.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Détails
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
                  <td className="py-3.5 px-4 text-right font-mono text-base font-bold text-blue-900">
                    {Math.round(globalFinancials.totalSale).toLocaleString('fr-FR')} FCFA
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
                  Fiche de Stock Détail
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{activeStoreDetail.storeSubtitle}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {activeStoreDetail.name}
              </h2>
            </div>

            {/* Total Financial Values for this store */}
            <div className="flex items-center gap-6 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Articles Détenus</span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {activeStoreDetail.units} <span className="text-xs font-normal text-slate-500">pièces</span>
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Coût d'Achat Reçu</span>
                <span className="text-lg font-bold font-mono text-slate-700">
                  {Math.round(activeStoreDetail.cost).toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-[11px] text-emerald-800 font-bold block">Valeur Marchande (Boutique)</span>
                <span className="text-xl font-extrabold font-mono text-emerald-700">
                  {Math.round(activeStoreDetail.sale).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>

          {/* List of articles received & held */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-slate-900">
                Articles Reçus et Présents dans ce Point de Vente ({activeStoreDetail.lines.length})
              </h3>
              {activeStoreDetail.cashier && (
                <button
                  onClick={() => openDistributionModal(undefined, activeStoreDetail.cashier?.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Distribuer d'autres articles à ce vendeur</span>
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
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Désignation</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4 text-center">Quantité Reçue</th>
                      <th className="py-3 px-4 text-right">Prix Achat</th>
                      <th className="py-3 px-4 text-right">Prix Vente</th>
                      <th className="py-3 px-4 text-right">Valeur Totale Achat</th>
                      <th className="py-3 px-4 text-right">Valeur Totale Vente</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeStoreDetail.lines.map((item) => (
                      <tr key={item.product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {item.product.sku}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.product.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px]">
                            {item.product.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 text-sm">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {item.product.costPrice.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {item.product.salePrice.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {Math.round(item.costSubtotal).toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          {Math.round(item.saleSubtotal).toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openDistributionModal(item.product.id, activeStoreDetail.cashier?.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Ajuster / Rapatrier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <td colSpan={3} className="py-3 px-4">
                        TOTAL DE CETTE BOUTIQUE
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {activeStoreDetail.units} pièces
                      </td>
                      <td colSpan={2}></td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {Math.round(activeStoreDetail.cost).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
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
    </div>
  );
};
