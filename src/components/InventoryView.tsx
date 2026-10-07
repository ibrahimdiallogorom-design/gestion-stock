import React, { useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Package,
  LayoutGrid,
  Table as TableIcon,
  Columns3,
  SlidersVertical,
  RotateCcw,
  Share2,
  Building2,
  Store,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product, STANDARD_CATEGORIES } from '../types';
import { CardsGridView } from './CardsGridView';
import { KanbanStockView } from './KanbanStockView';

export const InventoryView: React.FC = () => {
  const {
    products,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    viewMode,
    setViewMode,
    density,
    setDensity,
    openMovementModal,
    openProductModal,
    openConfirmModal,
    deleteProduct,
    clearAllProducts,
    repairInflatedPrices,
    openDistributionModal,
    appUsers,
    activeAppUser,
    setActiveTab,
  } = useStock();

  const isCashier = activeAppUser?.role === 'CASHIER';
  const myUserId = activeAppUser?.id;

  // Filtrage strict : Un caissier ne voit QUE les articles distribués à sa caisse, avec sa propre quantité
  const scopedProducts = useMemo(() => {
    if (isCashier && myUserId) {
      return products
        .filter((p) => (p.distributedQuantities?.[myUserId] || 0) > 0)
        .map((p) => ({
          ...p,
          quantity: p.distributedQuantities?.[myUserId] || 0,
        }));
    }
    return products;
  }, [products, isCashier, myUserId]);

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set([...STANDARD_CATEGORIES, ...scopedProducts.map((p) => p.category)].filter(Boolean)))];
  }, [scopedProducts]);

  const filteredProducts = useMemo(() => {
    return scopedProducts.filter((p) => {
      // Search
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;

      // Stock status
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
  }, [scopedProducts, searchQuery, categoryFilter, stockFilter]);

  const handleDelete = (product: Product) => {
    openConfirmModal(
      `Supprimer l'article ${product.sku} ?`,
      `Cette action retirera définitivement "${product.name}" du catalogue. Son historique de mouvements sera conservé. Êtes-vous certain de vouloir continuer ?`,
      () => deleteProduct(product.id),
      true,
      'Supprimer définitivement'
    );
  };

  const handleClearAll = () => {
    openConfirmModal(
      'Vider complètement le stock ?',
      'Cette action supprimera tous les articles actuellement enregistrés pour remettre votre catalogue à zéro (0 FCFA). Vous pourrez ensuite ajouter vos vrais articles sans aucune anomalie de calcul. Êtes-vous certain ?',
      () => clearAllProducts(),
      true,
      'Oui, vider tout le stock (0 F)'
    );
  };

  const getRowPadding = () => {
    switch (density) {
      case 'compact':
        return 'py-2 px-4';
      case 'touch':
        return 'py-4 px-4';
      default:
        return 'py-3 px-4';
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isCashier ? `Stock de ma Boutique (${activeAppUser?.fullName || 'Caisse'})` : 'Catalogue & Gestion des Stocks'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isCashier
              ? `Articles dotés et disponibles pour votre caisse. Prix de vente uniquement.`
              : 'Visualisez vos articles, surveillez les seuils de réapprovisionnement et effectuez des ajustements rapides.'}
          </p>
        </div>

        {/* View Switcher Controls (Cards / Table / Kanban) */}
        <div className="flex items-center gap-2">
          {/* View Mode Segmented Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cartes</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {/* Admin-only buttons */}
          {!isCashier && products.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
              title="Supprimer tous les articles du catalogue pour remettre les valeurs à 0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Vider le stock (0 F)</span>
            </button>
          )}

          {!isCashier && (
            <button
              onClick={() => openDistributionModal()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
              title="Distribuer des produits du Grand Magasin vers les vendeurs et sous-boutiques"
            >
              <Share2 className="w-4 h-4" />
              <span>Distribuer du stock</span>
            </button>
          )}

          {!isCashier && (
            <button
              onClick={() => openProductModal()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-600/20 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une référence</span>
            </button>
          )}

          {/* Cashier direct shortcut to POS */}
          {isCashier && (
            <button
              onClick={() => setActiveTab('caisse')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs shadow-emerald-600/20 transition-colors whitespace-nowrap"
            >
              <Store className="w-4 h-4" />
              <span>Ouvrir la Caisse</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, SKU ou fournisseur..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Segmented Stock Status Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/60 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                stockFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('normal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                stockFilter === 'normal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Normaux
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                stockFilter === 'low'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sous Seuil ({products.filter((p) => p.quantity <= p.minThreshold).length})
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                stockFilter === 'out_of_stock'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ruptures ({products.filter((p) => p.quantity === 0).length})
            </button>
          </div>

          {/* Density Picker (when in table mode) */}
          {viewMode === 'table' && (
            <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/60">
              <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Densité :</span>
              <button
                onClick={() => setDensity('compact')}
                className={`px-2 py-1 text-[11px] font-medium rounded ${
                  density === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setDensity('normal')}
                className={`px-2 py-1 text-[11px] font-medium rounded ${
                  density === 'normal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setDensity('touch')}
                className={`px-2 py-1 text-[11px] font-medium rounded ${
                  density === 'touch' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Tactile
              </button>
            </div>
          )}
        </div>

        {/* Category Filter Pills & Count */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Rayon :
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat === 'all' ? 'Toutes catégories' : cat}
              </button>
            ))}
          </div>
          <span className="text-slate-400 font-mono tabular-nums text-[11px]">
            {filteredProducts.length} article(s) affiché(s)
          </span>
        </div>
      </div>

      {/* Main Content Rendered based on ViewMode */}
      {viewMode === 'cards' && <CardsGridView />}

      {viewMode === 'kanban' && <KanbanStockView />}

      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Référence & Article</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4 text-right">{isCashier ? 'Stock en Boutique' : 'Stock Actuel'}</th>
                  <th className="py-3 px-4 text-right">Seuil Min.</th>
                  {!isCashier && <th className="py-3 px-4 text-right">Prix d'Achat</th>}
                  <th className="py-3 px-4 text-right">Prix de Vente</th>
                  {!isCashier && <th className="py-3 px-4">Fournisseur</th>}
                  <th className="py-3 px-4 text-center">{isCashier ? 'Vente' : 'Actions Rapides'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={isCashier ? 6 : 8} className="py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-medium text-slate-600">
                        {isCashier
                          ? 'Aucun article distribué à votre caisse pour le moment.'
                          : 'Aucun produit ne correspond à ces critères.'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {isCashier
                          ? 'Demandez à l’administrateur de vous doter du stock depuis le Grand Magasin.'
                          : 'Essayez de réinitialiser vos filtres ou effectuez une recherche différente.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isOutOfStock = product.quantity === 0;
                    const isCritical = product.quantity > 0 && product.quantity <= product.minThreshold;

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* SKU & Name */}
                        <td className={getRowPadding()}>
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 tracking-wider">
                            {product.sku} {product.location ? `· ${product.location}` : ''}
                          </div>
                        </td>

                        {/* Category */}
                        <td className={`${getRowPadding()} text-slate-600`}>
                          {product.category}
                        </td>

                        {/* Stock Quantity */}
                        <td className={`${getRowPadding()} text-right`}>
                          <div
                            className={`font-mono tabular-nums font-bold text-sm ${
                              isOutOfStock
                                ? 'text-rose-600'
                                : isCritical
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {product.quantity}
                          </div>
                          {!isCashier && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Dépôt: {product.centralQuantity !== undefined ? product.centralQuantity : product.quantity} · Caisses: {Object.values(product.distributedQuantities || {}).reduce((a, b) => a + (Number(b) || 0), 0)}
                            </div>
                          )}
                        </td>

                        {/* Min Threshold */}
                        <td className={`${getRowPadding()} text-right font-mono tabular-nums text-slate-500`}>
                          {product.minThreshold}
                        </td>

                        {/* Cost Price: Strictly hidden for Cashier */}
                        {!isCashier && (
                          <td className={`${getRowPadding()} text-right font-mono tabular-nums text-slate-600`}>
                            {Math.round(product.costPrice).toLocaleString('fr-FR')} F
                          </td>
                        )}

                        {/* Sale Price: Visible to all */}
                        <td className={`${getRowPadding()} text-right font-mono tabular-nums font-semibold text-slate-800`}>
                          {Math.round(product.salePrice).toLocaleString('fr-FR')} FCFA
                        </td>

                        {/* Supplier: Admin only */}
                        {!isCashier && (
                          <td className={`${getRowPadding()} text-slate-500 truncate max-w-[140px]`}>
                            {product.supplier}
                          </td>
                        )}

                        {/* Actions */}
                        <td className={getRowPadding()}>
                          {isCashier ? (
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => setActiveTab('caisse')}
                                disabled={product.quantity <= 0}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-2xs"
                              >
                                <Store className="w-3.5 h-3.5" />
                                <span>Vendre</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openDistributionModal(product.id)}
                                title="Distribuer aux vendeurs (Dotation)"
                                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openMovementModal(product.id, 'IN')}
                                title="Entrée de stock"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openMovementModal(product.id, 'OUT')}
                                disabled={product.quantity <= 0}
                                title="Sortie de stock"
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openProductModal(product)}
                                title="Modifier les informations"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(product)}
                                title="Supprimer la référence"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
