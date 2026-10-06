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
  } = useStock();

  // Metrics computation
  const totalStockValue = products.reduce((acc, p) => acc + p.quantity * p.costPrice, 0);
  const totalRetailValue = products.reduce((acc, p) => acc + p.quantity * p.salePrice, 0);
  const totalUnits = products.reduce((acc, p) => acc + p.quantity, 0);

  const outOfStockProducts = products.filter((p) => p.quantity === 0);
  const criticalStockProducts = products.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold);
  const lowStockCount = outOfStockProducts.length + criticalStockProducts.length;

  // Movements in the last 7 days or total
  const recentMovements = movements.slice(0, 6);
  const totalIn = movements.filter((m) => m.type === 'IN').reduce((acc, m) => acc + m.quantityDelta, 0);
  const totalOut = movements.filter((m) => m.type === 'OUT').reduce((acc, m) => acc + Math.abs(m.quantityDelta), 0);

  // Group by category
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const categoryStats = categories.map((cat) => {
    const prods = products.filter((p) => p.category === cat);
    const value = prods.reduce((acc, p) => acc + p.quantity * p.costPrice, 0);
    const units = prods.reduce((acc, p) => acc + p.quantity, 0);
    return { name: cat, count: prods.length, value, units };
  });

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

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valorisation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Valorisation Stock HT</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalStockValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Potentiel Vente TTC :</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700">
              {totalRetailValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
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
                <th className="py-3 px-6 text-right">Références</th>
                <th className="py-3 px-6 text-right">Volume d'Unités</th>
                <th className="py-3 px-6 text-right">Valeur Stock HT</th>
                <th className="py-3 px-6 text-right">Part dans le stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryStats.map((cat) => {
                const percentage = totalStockValue > 0 ? (cat.value / totalStockValue) * 100 : 0;
                return (
                  <tr key={cat.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-900">{cat.name}</td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums text-slate-600">
                      {cat.count}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums text-slate-600">
                      {cat.units}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {cat.value.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
