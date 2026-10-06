import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  PackageX,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  Store,
  Building2,
  Share2,
} from 'lucide-react';
import { useStock } from '../context/StockContext';

export const DashboardView: React.FC = () => {
  const {
    products,
    movements,
    setActiveTab,
    setStockFilter,
    openMovementModal,
    openProductModal,
    repairInflatedPrices,
    clearAllProducts,
    openConfirmModal,
    openDistributionModal,
    appUsers,
    activeAppUser,
  } = useStock();

  // Strict, verified financial calculations
  const totalCostValue = products.reduce(
    (acc, p) => acc + (Math.max(0, Number(p.quantity) || 0) * Math.max(0, Number(p.costPrice) || 0)),
    0
  );
  const totalSaleValue = products.reduce(
    (acc, p) => acc + (Math.max(0, Number(p.quantity) || 0) * Math.max(0, Number(p.salePrice) || 0)),
    0
  );
  const totalUnits = products.reduce(
    (acc, p) => acc + Math.max(0, Number(p.quantity) || 0),
    0
  );
  const totalProfitExpected = Math.max(0, totalSaleValue - totalCostValue);
  const marginPercentage = totalSaleValue > 0 ? (totalProfitExpected / totalSaleValue) * 100 : 0;

  const outOfStockProducts = products.filter((p) => (Number(p.quantity) || 0) <= 0);
  const criticalStockProducts = products.filter(
    (p) => (Number(p.quantity) || 0) > 0 && (Number(p.quantity) || 0) <= (Number(p.minThreshold) || 0)
  );
  const lowStockCount = outOfStockProducts.length + criticalStockProducts.length;

  // Movements in the last 7 days or total
  const recentMovements = movements.slice(0, 6);
  const totalIn = movements.filter((m) => m.type === 'IN').reduce((acc, m) => acc + Math.abs(Number(m.quantityDelta) || 0), 0);
  const totalOut = movements.filter((m) => m.type === 'OUT').reduce((acc, m) => acc + Math.abs(Number(m.quantityDelta) || 0), 0);

  // Group by category with verified mathematics
  const categories = Array.from(new Set(products.map((p) => p.category?.trim() || 'Général')));
  const categoryStats = categories.map((cat) => {
    const prods = products.filter((p) => (p.category?.trim() || 'Général') === cat);
    const costVal = prods.reduce(
      (acc, p) => acc + (Math.max(0, Number(p.quantity) || 0) * Math.max(0, Number(p.costPrice) || 0)),
      0
    );
    const saleVal = prods.reduce(
      (acc, p) => acc + (Math.max(0, Number(p.quantity) || 0) * Math.max(0, Number(p.salePrice) || 0)),
      0
    );
    const units = prods.reduce((acc, p) => acc + Math.max(0, Number(p.quantity) || 0), 0);
    const profit = Math.max(0, saleVal - costVal);
    return { name: cat, count: prods.length, costVal, saleVal, units, profit };
  });

  // Multi-Store & Sub-boutique distribution statistics
  const cashiers = appUsers.filter((u) => u.role === 'CASHIER');
  const isCashier = activeAppUser?.role === 'CASHIER';

  const myCashierStock = React.useMemo(() => {
    if (!isCashier || !activeAppUser) return null;
    let units = 0;
    let costVal = 0;
    let saleVal = 0;
    let count = 0;
    products.forEach((p) => {
      const q = p.distributedQuantities?.[activeAppUser.id] || 0;
      if (q > 0) {
        units += q;
        costVal += q * p.costPrice;
        saleVal += q * p.salePrice;
        count += 1;
      }
    });
    return { units, costVal, saleVal, count };
  }, [isCashier, activeAppUser, products]);

  const centralStockMetrics = React.useMemo(() => {
    let units = 0;
    let costVal = 0;
    let saleVal = 0;
    products.forEach((p) => {
      const c = p.centralQuantity !== undefined ? p.centralQuantity : p.quantity;
      units += c;
      costVal += c * p.costPrice;
      saleVal += c * p.salePrice;
    });
    return { units, costVal, saleVal };
  }, [products]);

  const storeBreakdowns = React.useMemo(() => {
    return cashiers.map((cashier) => {
      let units = 0;
      let costVal = 0;
      let saleVal = 0;
      products.forEach((p) => {
        const q = p.distributedQuantities?.[cashier.id] || 0;
        units += q;
        costVal += q * p.costPrice;
        saleVal += q * p.salePrice;
      });
      return { cashier, units, costVal, saleVal };
    });
  }, [cashiers, products]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner / Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tableau de Bord Logistique & Boutique
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervision des niveaux de stock, alertes de réapprovisionnement et valorisation financière.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setStockFilter('low');
              setActiveTab('inventory');
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{lowStockCount} Articles à surveiller</span>
          </button>
          <button
            onClick={() => openProductModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-600/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajouter une référence</span>
          </button>
        </div>
      </div>

      {/* Anomaly Detection & Quick Fix Banner */}
      {totalSaleValue > 5000000 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">
                Montant total anormal détecté : {Math.round(totalSaleValue).toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Certains articles enregistrés précédemment ont pu conserver des prix multipliés. Vous pouvez soit corriger les prix gonflés, soit remettre le stock à 0 pour saisir vos vrais articles.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => repairInflatedPrices()}
              className="flex-1 md:flex-initial px-3.5 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            >
              Corriger les prix (÷ 650)
            </button>
            <button
              onClick={() => {
                openConfirmModal(
                  'Vider tout le stock ?',
                  'Cette action supprimera tous les articles actuellement enregistrés pour remettre votre catalogue à zéro (0 FCFA). Vous pourrez ensuite saisir vos articles exacts sans anomalie.',
                  () => clearAllProducts(),
                  true,
                  'Vider le stock (0 F)'
                );
              }}
              className="flex-1 md:flex-initial px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs transition-colors"
            >
              Vider le stock (0 F)
            </button>
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valorisation Financière du Stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Valeur Marchande (Prix Vente)</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {Math.round(totalSaleValue).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100 font-mono">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-slate-500">Coût d'Achat Réel :</span>
              <span className="font-semibold text-slate-700">
                {Math.round(totalCostValue).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-700 font-semibold">
              <span className="font-sans text-[11px]">Bénéfice estimé :</span>
              <span>
                +{Math.round(totalProfitExpected).toLocaleString('fr-FR')} F ({marginPercentage.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Units & SKUs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Catalogue & Pièces</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalUnits}
            </span>
            <span className="text-xs text-slate-500">unités en stock</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Références actives :</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700">
              {products.length} articles
            </span>
          </div>
        </div>

        {/* Card 3: Critical & Out of Stock */}
        <div
          onClick={() => {
            setStockFilter(outOfStockProducts.length > 0 ? 'out_of_stock' : 'low');
            setActiveTab('inventory');
          }}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Alertes Seuil & Ruptures</span>
            <PackageX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {lowStockCount}
            </span>
            <span className="text-xs text-slate-500">articles sous seuil</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Dont {outOfStockProducts.length} rupture(s)</span>
            <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-0.5">
              Voir <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Monthly Flow Volume */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Flux d'Entrées / Sorties</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-lg font-bold font-mono tabular-nums">+{totalIn}</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-700">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-lg font-bold font-mono tabular-nums">-{totalOut}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Opérations tracées :</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700">
              {movements.length} mouvements
            </span>
          </div>
        </div>
      </div>

      {/* Cashier Personal Store Valuation Banner (When logged in as Cashier) */}
      {isCashier && myCashierStock && (
        <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white p-5 rounded-2xl shadow-md border border-indigo-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl">
              <Store className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">
                Votre Point de Vente / Caisse
              </span>
              <h3 className="text-lg font-bold">
                {activeAppUser?.storeName || activeAppUser?.fullName}
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Vous détenez {myCashierStock.count} référence(s) pour un total de {myCashierStock.units} article(s) en caisse.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/10 px-5 py-3 rounded-xl border border-white/10">
            <div>
              <span className="text-[11px] text-indigo-200 block font-medium">Coût Achat Reçu</span>
              <span className="text-base font-bold font-mono">
                {Math.round(myCashierStock.costVal).toLocaleString('fr-FR')} F
              </span>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div>
              <span className="text-[11px] text-emerald-300 block font-bold">Valeur de Votre Boutique</span>
              <span className="text-xl font-extrabold font-mono text-emerald-300">
                {Math.round(myCashierStock.saleVal).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Store & Central Warehouse Distribution Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                Grand Magasin & Caisses
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Répartition des Stocks par Boutique
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisation des marchandises stockées au dépôt central et distribuées à chaque vendeur.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openDistributionModal()}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Distribuer un article</span>
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Grand Magasin Central Item */}
          <div
            onClick={() => setActiveTab('distribution')}
            className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Grand Magasin (Dépôt)
              </span>
              <span className="font-mono font-bold text-blue-700">
                {centralStockMetrics.units} pcs
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[11px] text-slate-500">Valeur Vente :</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {Math.round(centralStockMetrics.saleVal).toLocaleString('fr-FR')} F
              </span>
            </div>
          </div>

          {/* Sub-Boutiques / Cashiers */}
          {storeBreakdowns.map((sb) => (
            <div
              key={sb.cashier.id}
              onClick={() => setActiveTab('distribution')}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                  <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{sb.cashier.fullName}</span>
                </span>
                <span className="font-mono font-bold text-indigo-700 shrink-0">
                  {sb.units} pcs
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[11px] text-slate-500">Valeur Boutique :</span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {Math.round(sb.saleVal).toLocaleString('fr-FR')} F
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Urgent Reorders + Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Urgent Replenishment Column (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Réapprovisionnements Prioritaires
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Articles dont le stock actuel est inférieur ou égal au stock de sécurité minimal
              </p>
            </div>
            <button
              onClick={() => {
                setStockFilter('low');
                setActiveTab('inventory');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Tout voir ({lowStockCount})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {criticalStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <p className="font-medium text-slate-700">Tous les stocks sont au-dessus des seuils d'alerte.</p>
              <p className="text-xs text-slate-400 mt-1">Vos stocks sont actuellement optimisés.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...outOfStockProducts, ...criticalStockProducts].slice(0, 5).map((item) => {
                const isOutOfStock = item.quantity === 0;
                return (
                  <div
                    key={item.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500 font-medium">
                          {item.sku}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{item.category}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Fournisseur : {item.supplier}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold font-mono tabular-nums ${
                            isOutOfStock ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          {item.quantity} / {item.minThreshold} min
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isOutOfStock ? 'Rupture immédiate' : 'Alerte seuil'}
                        </div>
                      </div>

                      <button
                        onClick={() => openMovementModal(item.id, 'IN')}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60 whitespace-nowrap"
                      >
                        + Réceptionner
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Movements Log (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Mouvements Récents</h2>
            <button
              onClick={() => setActiveTab('movements')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Historique
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {recentMovements.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Aucun mouvement consigné pour le moment.
              </div>
            ) : (
              recentMovements.map((mov) => {
                const isPositive = mov.quantityDelta > 0;
                return (
                  <div
                    key={mov.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate pr-2">
                        {mov.productName}
                      </span>
                      <span
                        className={`font-mono tabular-nums font-bold ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span className="truncate">{mov.reason}</span>
                      <span className="font-mono text-slate-400 shrink-0 ml-2">
                        {new Date(mov.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/40 text-center">
            <button
              onClick={() => openMovementModal()}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              + Enregistrer une nouvelle transaction
            </button>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Répartition par Catégorie</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Valorisation et volume d'unités réparties par rayon
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Catégorie</th>
                <th className="py-3 px-4 text-right">Articles</th>
                <th className="py-3 px-4 text-right">Unités</th>
                <th className="py-3 px-4 text-right">Valeur d'Achat</th>
                <th className="py-3 px-4 text-right">Valeur de Vente</th>
                <th className="py-3 px-4 text-right text-emerald-700">Marge Brute</th>
                <th className="py-3 px-6 text-right">Part Vente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Aucun article dans le catalogue. Cliquez sur « Ajouter une référence » pour enregistrer vos produits.
                  </td>
                </tr>
              ) : (
                categoryStats.map((cat) => {
                  const percentage = totalSaleValue > 0 ? (cat.saleVal / totalSaleValue) * 100 : 0;
                  return (
                    <tr key={cat.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-6 font-medium text-slate-900">{cat.name}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {cat.count}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {cat.units}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {Math.round(cat.costVal).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {Math.round(cat.saleVal).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        +{Math.round(cat.profit).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-slate-500 text-[11px] w-10 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
