import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product } from '../types';

export const ProductModal: React.FC = () => {
  const { productModal, closeProductModal, addProduct, updateProduct, products } = useStock();

  const isEditing = !!productModal.product;

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mode & Textile');
  const [quantity, setQuantity] = useState<number>(10);
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [costPrice, setCostPrice] = useState<number>(10.0);
  const [salePrice, setSalePrice] = useState<number>(25.0);
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('Rayon principal');
  const [error, setError] = useState<string | null>(null);

  const existingCategories = Array.from(new Set(products.map((p) => p.category)));

  useEffect(() => {
    if (productModal.isOpen) {
      if (productModal.product) {
        const p = productModal.product;
        setSku(p.sku);
        setName(p.name);
        setCategory(p.category);
        setQuantity(p.quantity);
        setMinThreshold(p.minThreshold);
        setCostPrice(p.costPrice);
        setSalePrice(p.salePrice);
        setSupplier(p.supplier);
        setLocation(p.location || 'Rayon principal');
      } else {
        // Defaults for new product
        const prefix = 'ART';
        const num = String(products.length + 1).padStart(3, '0');
        setSku(`${prefix}-${num}`);
        setName('');
        setCategory(existingCategories[0] || 'Mode & Textile');
        setQuantity(10);
        setMinThreshold(5);
        setCostPrice(12.0);
        setSalePrice(29.9);
        setSupplier('Fournisseur Direct');
        setLocation('Rayon A-01');
      }
      setError(null);
    }
  }, [productModal, products]);

  if (!productModal.isOpen) return null;

  const handleGenerateSku = () => {
    const catPrefix = category.slice(0, 3).toUpperCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setSku(`${catPrefix}-${randomSuffix}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sku.trim() || !name.trim()) {
      setError('Le code SKU et le libellé de l’article sont obligatoires.');
      return;
    }

    if (!isEditing && products.some((p) => p.sku.toLowerCase() === sku.trim().toLowerCase())) {
      setError('Un article avec ce code SKU existe déjà dans votre catalogue.');
      return;
    }

    if (costPrice < 0 || salePrice < 0 || quantity < 0 || minThreshold < 0) {
      setError('Les montants et quantités doivent être des valeurs positives ou nulles.');
      return;
    }

    if (isEditing && productModal.product) {
      updateProduct(productModal.product.id, {
        sku: sku.trim(),
        name: name.trim(),
        category,
        minThreshold,
        costPrice,
        salePrice,
        supplier: supplier.trim(),
        location: location.trim(),
      });
    } else {
      addProduct({
        sku: sku.trim(),
        name: name.trim(),
        category,
        quantity,
        minThreshold,
        costPrice,
        salePrice,
        supplier: supplier.trim() || 'Fournisseur direct',
        location: location.trim() || 'Rayon principal',
      });
    }

    closeProductModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? "Modifier la fiche article" : "Ajouter un nouvel article au catalogue"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Renseignez les détails, prix et seuils de réapprovisionnement
            </p>
          </div>
          <button
            onClick={closeProductModal}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* SKU & Name */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="font-semibold text-slate-700 block mb-1">
                Code SKU *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="EX: PRD-001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Désignation de l'article *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Chemise Lin Col Mandarin"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Catégorie / Rayon
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              >
                {existingCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Autre / Divers">Autre / Divers</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Emplacement / Casier
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Rayon B-04"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>
          </div>

          {/* Quantity & Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                {isEditing ? "Stock Actuel" : "Stock Initial en Stock"}
              </label>
              <input
                type="number"
                min="0"
                disabled={isEditing}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              />
              {isEditing && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Utilisez les mouvements pour ajuster le stock.
                </span>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Seuil d'Alerte Minimum
              </label>
              <input
                type="number"
                min="0"
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums text-slate-900"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Prix d'achat (FCFA)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Prix de vente (FCFA)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums text-slate-900"
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Fournisseur principal
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ex: Textiles de France"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeProductModal}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs shadow-blue-600/20 transition-colors"
            >
              {isEditing ? "Enregistrer les modifications" : "Créer la référence"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
