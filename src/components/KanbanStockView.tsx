import React from 'react';
import {
  AlertTriangle,
  PackageX,
  PackageCheck,
  Warehouse,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product } from '../types';

export const KanbanStockView: React.FC = () => {
  const {
    products,
    searchQuery,
    categoryFilter,
    openMovementModal,
    openProductModal,
    recordMovement,
  } = useStock();

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const columns = [
    {
      id: 'out',
      title: 'Ruptures de Stock',
      subtitle: 'Approvisionnement requis d’urgence',
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
      icon: <PackageX className="w-4 h-4 text-rose-600" />,
      items: filtered.filter((p) => p.quantity === 0),
    },
    {
      id: 'low',
      title: 'Seuil Critique',
      subtitle: 'Stock <= Seuil de sécurité',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      items: filtered.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold),
    },
    {
      id: 'optimal',
      title: 'Niveau Conforme',
      subtitle: 'Rotation saine des ventes',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: <PackageCheck className="w-4 h-4 text-emerald-600" />,
      items: filtered.filter((p) => p.quantity > p.minThreshold && p.quantity <= 25),
    },
    {
      id: 'reserve',
      title: 'Volume Confortable',
      subtitle: 'Stock supérieur à 25 unités',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
      icon: <Warehouse className="w-4 h-4 text-blue-600" />,
      items: filtered.filter((p) => p.quantity > 25),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
      {columns.map((col) => (
        <div
          key={col.id}
          className="bg-slate-100/75 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]"
        >
          {/* Column Header */}
          <div className="p-2 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {col.icon}
              <span className="text-xs font-bold text-slate-800">{col.title}</span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${col.badgeColor}`}
            >
              {col.items.length}
            </span>
          </div>

          {/* Cards Column List */}
          <div className="space-y-2.5 flex-1">
            {col.items.length === 0 ? (
              <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                Aucun article dans cet état
              </div>
            ) : (
              col.items.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all space-y-2.5"
                >
                  {/* Top SKU & Category */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-slate-500">{p.sku}</span>
                    <span className="text-slate-400">{p.category.split(' ')[0]}</span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {p.name}
                  </h4>

                  {/* Stock Bar */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Dispo :{' '}
                      <strong className="font-mono text-slate-900">{p.quantity}</strong> / {p.minThreshold} min
                    </span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {p.salePrice.toFixed(2)} €
                    </span>
                  </div>

                  {/* Interactive Action Bar */}
                  <div className="flex items-center justify-between pt-1 gap-1">
                    <button
                      onClick={() => openMovementModal(p.id, 'IN')}
                      className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/50"
                    >
                      <ArrowDownRight className="w-3 h-3" />
                      <span>+ Réception</span>
                    </button>

                    <button
                      onClick={() => openMovementModal(p.id, 'OUT')}
                      disabled={p.quantity <= 0}
                      className="flex items-center justify-center py-1 px-2 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200/50 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Vente</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
