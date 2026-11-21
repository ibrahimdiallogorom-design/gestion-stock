import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  Share2,
  ShoppingCart,
  Check,
  X,
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
    updateProduct,
    recordMovement,
    openDistributionModal,
    openDirectSaleModal,
    theme,
    activeAppUser,
    setActiveTab,
  } = useStock();

  const isCashier = activeAppUser?.role === 'CASHIER';
  const myUserId = activeAppUser?.id;

  // État d'édition rapide des prix directement sur la carte
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editSaleInput, setEditSaleInput] = useState<string>('');
  const [editCostInput, setEditCostInput] = useState<string>('');
  const [editWholesaleInput, setEditWholesaleInput] = useState<string>('');
  const [editTransferInput, setEditTransferInput] = useState<string>('');
  const [savedToastId, setSavedToastId] = useState<string | null>(null);

  const startEditingPrice = (p: Product) => {
    const effectiveSale =
      isCashier && myUserId && p.distributedMarketPrices?.[myUserId] !== undefined
        ? p.distributedMarketPrices[myUserId]
        : p.salePrice;
    const effectiveTransfer =
      isCashier && myUserId && p.distributedTransferPrices?.[myUserId] !== undefined
        ? p.distributedTransferPrices[myUserId]
        : p.cashierTransferPrice ?? 0;

    setEditingPriceId(p.id);
    setEditSaleInput(String(Math.round(effectiveSale || 0)));
    setEditCostInput(String(Math.round(p.costPrice || 0)));
    setEditWholesaleInput(p.wholesalePrice && p.wholesalePrice > 0 ? String(Math.round(p.wholesalePrice)) : '');
    setEditTransferInput(effectiveTransfer > 0 ? String(Math.round(effectiveTransfer)) : '');
  };

  const handleSaveQuickPrice = async (p: Product) => {
    const newSale = Math.max(0, Math.round(Number(editSaleInput) || 0));
    const newCost = Math.max(0, Math.round(Number(editCostInput) || 0));
    const newWholesale = Math.max(0, Math.round(Number(editWholesaleInput) || 0));
    const newTransfer = Math.max(0, Math.round(Number(editTransferInput) || 0));

    const updates: Partial<Product> = {
      salePrice: newSale,
    };

    if (!isCashier) {
      updates.costPrice = newCost;
      updates.wholesalePrice = newWholesale > 0 ? newWholesale : undefined;
      updates.cashierTransferPrice = newTransfer > 0 ? newTransfer : undefined;
    } else if (myUserId) {
      updates.distributedMarketPrices = {
        ...(p.distributedMarketPrices || {}),
        [myUserId]: newSale,
      };
      if (newTransfer > 0) {
        updates.distributedTransferPrices = {
          ...(p.distributedTransferPrices || {}),
          [myUserId]: newTransfer,
        };
      }
    }

    await updateProduct(p.id, updates);
    setEditingPriceId(null);
    setSavedToastId(p.id);
    setTimeout(() => {
      setSavedToastId((prev) => (prev === p.id ? null : prev));
    }, 2500);
  };

  // Filtrage strict : Un caissier ne voit QUE les articles distribués à sa caisse, avec sa propre quantité
  const scopedProducts = React.useMemo(() => {
    if (isCashier && myUserId) {
      return products
        .filter((p) => (p.distributedQuantities?.[myUserId] || 0) > 0)
        .map((p) => ({
          ...p,
          quantity: p.distributedQuantities?.[myUserId] || 0,
          salePrice:
            p.distributedMarketPrices?.[myUserId] !== undefined
              ? p.distributedMarketPrices[myUserId]
              : p.salePrice,
        }));
    }
    return products;
  }, [products, isCashier, myUserId]);

  const filteredProducts = scopedProducts.filter((p) => {
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
      'Mode & Vêtements': {
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
      'Électronique & Informatique': {
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
      'Alimentation & Boissons': {
        bg: 'from-amber-600/10 via-yellow-500/10 to-stone-500/10',
        text: 'text-yellow-800',
        border: 'border-yellow-200/50',
        accent: 'bg-yellow-600',
      },
      'Médicaments & Pharmacie': {
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
      'Cosmétique & Beauté': {
        bg: 'from-purple-500/10 via-pink-500/10 to-rose-500/10',
        text: 'text-purple-800',
        border: 'border-purple-200/50',
        accent: 'bg-purple-600',
      },
      'Quincaillerie & Matériaux': {
        bg: 'from-slate-600/10 via-zinc-500/10 to-stone-500/10',
        text: 'text-slate-800',
        border: 'border-slate-300',
        accent: 'bg-slate-700',
      },
      'Fournitures & Papeterie': {
        bg: 'from-cyan-500/10 via-sky-500/10 to-blue-500/10',
        text: 'text-cyan-800',
        border: 'border-cyan-200/50',
        accent: 'bg-cyan-600',
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

  if (filteredProducts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
        <Package className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="text-sm font-bold text-slate-700">
          {isCashier
            ? 'Aucun article octroyé à votre boutique pour le moment'
            : 'Aucun produit ne correspond à ces critères'}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {isCashier
            ? 'Le Grand Magasin ne vous a pas encore attribué de stock. Les articles alloués apparaîtront automatiquement ici.'
            : 'Essayez de réinitialiser vos filtres ou effectuez une recherche différente.'}
        </p>
      </div>
    );
  }

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
              {p.imageUrl ? (
                <div className="h-36 w-full bg-slate-100 border-b border-slate-200 overflow-hidden relative group-hover:scale-[1.01] transition-transform duration-300">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold">
                    {p.category}
                  </div>
                </div>
              ) : (
                getCategoryIllustration(p.category, p.name)
              )}

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* SKU & Location */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="font-semibold text-slate-600">{p.sku}</span>
                  <span>{p.location || 'Rayon A'}</span>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
                  {p.name}
                </h3>

                {/* Stock Level Metric Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-medium text-slate-500">
                      Disponibilité
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-black font-mono tabular-nums ${
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
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
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

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums pt-0.5">
                    <span>Seuil: {p.minThreshold}</span>
                    <span className="truncate max-w-[120px]">Fournisseur: {p.supplier.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Financial Summary & Inline Quick Price Editor */}
                {editingPriceId === p.id ? (
                  <div className="p-3 bg-amber-50/90 border-2 border-amber-400 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                        <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Modifier les prix (FCFA)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingPriceId(null)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                        title="Fermer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {!isCashier && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Prix d'Achat
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editCostInput}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditCostInput(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      )}
                      <div className={isCashier ? 'col-span-2' : ''}>
                        <label className="text-[10px] font-bold text-emerald-900 block mb-0.5">
                          Prix Vente / Marché *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editSaleInput}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditSaleInput(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border-2 border-emerald-500 rounded-lg text-xs font-mono font-black text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    {!isCashier && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-indigo-800 block mb-0.5">
                            Prix en Gros
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editWholesaleInput}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditWholesaleInput(e.target.value)}
                            placeholder="Optionnel"
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-blue-800 block mb-0.5">
                            Prix Remis Caisse
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editTransferInput}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditTransferInput(e.target.value)}
                            placeholder="Ex: 4000"
                            className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveQuickPrice(p)}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Enregistrer le prix</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPriceId(null)}
                        className="py-1.5 px-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {isCashier ? (
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block">
                            Prix de Vente :
                          </span>
                          <span className="font-mono text-base sm:text-lg font-black text-slate-900">
                            {Math.round(p.salePrice).toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => startEditingPrice(p)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-amber-700" />
                          <span>Changer prix</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div
                          onClick={() => startEditingPrice(p)}
                          title="Cliquez pour modifier les prix directement"
                          className="grid grid-cols-2 gap-2 text-xs p-2 rounded-xl bg-slate-50/70 hover:bg-amber-50/60 border border-transparent hover:border-amber-200 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 block">
                              Prix d'Achat
                            </span>
                            <span className="font-mono tabular-nums text-slate-700 font-semibold text-xs sm:text-sm">
                              {Math.round(p.costPrice).toLocaleString('fr-FR')} F
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] sm:text-[11px] text-slate-400 block">
                              Prix de Vente
                            </span>
                            <span className="font-mono tabular-nums font-black text-slate-900 text-sm sm:text-base">
                              {Math.round(p.salePrice).toLocaleString('fr-FR')} F
                            </span>
                          </div>
                        </div>

                        {(p.wholesalePrice || p.cashierTransferPrice) && (
                          <div className="flex flex-wrap items-center justify-between gap-1 px-1 text-[10px] font-mono">
                            {p.wholesalePrice && p.wholesalePrice > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                                Gros: {Math.round(p.wholesalePrice).toLocaleString('fr-FR')} F
                              </span>
                            ) : <span />}
                            {p.cashierTransferPrice && p.cashierTransferPrice > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                                Caisse: {Math.round(p.cashierTransferPrice).toLocaleString('fr-FR')} F
                              </span>
                            ) : null}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-0.5">
                          {savedToastId === p.id ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Prix enregistré !
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditingPrice(p)}
                              className="w-full py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit2 className="w-3 h-3 text-amber-700" />
                              <span>Modifier les prix (Vente / Gros / Caisse)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Footer */}
            <div className="p-3 bg-slate-50/75 border-t border-slate-100">
              {isCashier ? (
                <button
                  onClick={() => setActiveTab('caisse')}
                  disabled={p.quantity <= 0}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-2xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Vendre en Caisse ({p.quantity} dispo)</span>
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  {/* Safe Stock Badge */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-medium">Stock:</span>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {p.quantity} pcs
                    </span>
                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDirectSaleModal(p.id)}
                      disabled={p.quantity <= 0}
                      title="Vendre directement depuis le Grand Magasin"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-2xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Vendre</span>
                    </button>
                    <button
                      onClick={() => openMovementModal(p.id, 'IN')}
                      title="Nouveau mouvement détaillé"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDistributionModal(p.id)}
                      title="Distribuer aux vendeurs (Dotation)"
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-white rounded-md transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openProductModal(p)}
                      title="Modifier toute la fiche article"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
