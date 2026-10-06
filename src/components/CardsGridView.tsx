import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product } from '../types';

export const CardsGridView: React.FC = () => {
  const {
    products,
    searchQuery,
    categoryFilter,
    stockFilter,
    openMovementModal,
    openProductModal,
    openConfirmModal,
    deleteProduct,
    recordMovement,
    theme,
  } = useStock();

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;

    let matchStatus = true;
    if (stockFilter === 'out_of_stock') {
      matchStatus = p.quantity === 0;
    } else if (stockFilter === 'low') {
      matchStatus = p.quantity <= p.minThreshold;
    } else if (stockFilter === 'normal') {
      matchStatus = p.quantity > p.minThreshold;
    }

    return matchSearch && matchCategory && matchStatus;
  });

  const getCategoryIllustration = (category: string, name: string) => {
    // Generate harmonious curated visual pattern & gradient based on category
    const palette: Record<string, { bg: string; text: string; border: string; accent: string }> = {
      'Mode & Textile': {
        bg: 'from-amber-500/10 via-rose-500/10 to-orange-500/10',
        text: 'text-amber-800',
        border: 'border-amber-200/50',
        accent: 'bg-amber-600',
      },
      'Électronique & Son': {
        bg: 'from-blue-500/10 via-indigo-500/10 to-violet-500/10',
        text: 'text-blue-800',
        border: 'border-blue-200/50',
        accent: 'bg-blue-600',
      },
      'Maison & Déco': {
        bg: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
        text: 'text-emerald-800',
        border: 'border-emerald-200/50',
        accent: 'bg-emerald-600',
      },
      'Soins & Beauté': {
        bg: 'from-purple-500/10 via-pink-500/10 to-rose-500/10',
        text: 'text-purple-800',
        border: 'border-purple-200/50',
        accent: 'bg-purple-600',
      },
      'Épicerie Fine': {
        bg: 'from-amber-600/10 via-yellow-500/10 to-stone-500/10',
        text: 'text-yellow-800',
        border: 'border-yellow-200/50',
        accent: 'bg-yellow-600',
      },
    };

    const scheme = palette[category] || {
      bg: 'from-slate-500/10 to-slate-400/10',
      text: 'text-slate-800',
      border: 'border-slate-200',
      accent: 'bg-slate-600',
    };

    const initials = name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

    return (
      <div
        className={`h-36 w-full bg-gradient-to-br ${scheme.bg} border-b ${scheme.border} flex flex-col items-center justify-center relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-300`}
      >
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-white/80 flex items-center justify-center">
            <span className={`text-base font-bold font-mono tracking-tight ${scheme.text}`}>
              {initials}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 mt-2 tracking-wide">
            {category}
          </span>
        </div>

        {/* Minimal geometric decoration */}
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-white/30 blur-xs pointer-events-none" />
      </div>
    );
  };

  const handleQuickAdd = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    recordMovement(
      p.id,
      'IN',
      1,
      'Réassort rapide comptoir (+1)',
      'Vendeur Boutique',
      'Ajustement express 1 clic'
    );
  };

  const handleQuickSubtract = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.quantity <= 0) return;
    recordMovement(
      p.id,
      'OUT',
      1,
      'Sortie express comptoir (-1)',
      'Vendeur Boutique',
      'Vente unitaire directe'
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {filteredProducts.map((p) => {
        const isOutOfStock = p.quantity === 0;
        const isCritical = p.quantity > 0 && p.quantity <= p.minThreshold;
        const margin = p.salePrice - p.costPrice;
        const marginRate = p.salePrice > 0 ? (margin / p.salePrice) * 100 : 0;
        const stockRatio = p.minThreshold > 0 ? (p.quantity / (p.minThreshold * 2)) * 100 : 50;

        return (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              {/* Product Visual Header */}
              {getCategoryIllustration(p.category, p.name)}

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* SKU & Location */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="font-semibold text-slate-600">{p.sku}</span>
                  <span>{p.location || 'Rayon A'}</span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
                  {p.name}
                </h3>

                {/* Stock Level Metric Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">
                      Disponibilité en magasin
                    </span>
                    <span
                      className={`text-xs font-bold font-mono tabular-nums ${
                        isOutOfStock
                          ? 'text-rose-600'
                          : isCritical
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isOutOfStock ? 'Rupture' : `${p.quantity} unités`}
                    </span>
                  </div>

                  {/* Progress Bar Gauge */}
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOutOfStock
                          ? 'bg-rose-500 w-0'
                          : isCritical
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, stockRatio))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono tabular-nums pt-0.5">
                    <span>Seuil mini : {p.minThreshold}</span>
                    <span>Fournisseur : {p.supplier.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Prix Achat HT</span>
                    <span className="font-mono tabular-nums text-slate-700 font-medium">
                      {p.costPrice.toFixed(2)} €
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Prix Vente TTC</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {p.salePrice.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Footer & Stepper */}
            <div className="p-3 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
              {/* Stepper Buttons for Quick Store Cashier / Clerk Adjustments */}
              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                <button
                  onClick={(e) => handleQuickSubtract(p, e)}
                  disabled={p.quantity <= 0}
                  title="Vente / Sortie de 1 unité"
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono tabular-nums text-xs font-bold text-slate-800">
                  {p.quantity}
                </span>
                <button
                  onClick={(e) => handleQuickAdd(p, e)}
                  title="Réception / Entrée de 1 unité"
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                >
                  +
                </button>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openMovementModal(p.id, 'IN')}
                  title="Nouveau mouvement détaillé"
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openProductModal(p)}
                  title="Modifier la fiche"
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
