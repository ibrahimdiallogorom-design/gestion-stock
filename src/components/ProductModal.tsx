import React, { useState, useEffect } from 'react';
import { X, Sparkles, Calculator, ChevronDown, ChevronUp, Check, Truck } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product, STANDARD_CATEGORIES } from '../types';

export const ProductModal: React.FC = () => {
  const { productModal, closeProductModal, addProduct, updateProduct, products } = useStock();

  const isEditing = !!productModal.product;

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(STANDARD_CATEGORIES[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [minThreshold, setMinThreshold] = useState<number>(2);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('Rayon principal');
  const [error, setError] = useState<string | null>(null);

  // Calculateur interactif de Coût de Revient (Achat + Transport)
  const [showCostCalculator, setShowCostCalculator] = useState(false);
  const [calcQty, setCalcQty] = useState<number>(10);
  const [calcTotalPurchase, setCalcTotalPurchase] = useState<number>(0);
  const [calcShippingCost, setCalcShippingCost] = useState<number>(0);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(30);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const allCategories = Array.from(
    new Set([...STANDARD_CATEGORIES, ...products.map((p) => p.category).filter(Boolean)])
  );

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
        setCategory(STANDARD_CATEGORIES[0]);
        setIsCustomCategory(false);
        setCustomCategoryName('');
        setQuantity(1);
        setMinThreshold(2);
        setCostPrice(0);
        setSalePrice(0);
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

    const finalCategory = isCustomCategory
      ? customCategoryName.trim() || 'Divers & Général'
      : category;

    if (isEditing && productModal.product) {
      updateProduct(productModal.product.id, {
        sku: sku.trim(),
        name: name.trim(),
        category: finalCategory,
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
        category: finalCategory,
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
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 block">
                  Catégorie / Rayon
                </label>
                {isCustomCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCustomCategoryName('');
                    }}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Choisir une liste
                  </button>
                )}
              </div>
              {!isCustomCategory ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCustomCategory(true);
                      setCustomCategoryName('');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__NEW__">+ Créer une nouvelle catégorie...</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="Ex: Électronique, Boissons, etc."
                  className="w-full px-3 py-2 bg-white border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  autoFocus
                />
              )}
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

          {/* Calculateur de Coût de Revient (Achat + Transport) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            <button
              type="button"
              onClick={() => {
                setShowCostCalculator(!showCostCalculator);
                setAppliedSuccess(false);
              }}
              className="w-full flex items-center justify-between text-left font-semibold text-blue-900 text-xs hover:text-blue-700"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Calculateur de Coût de Revient (Prix d'achat + Transport)</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-blue-600">
                {showCostCalculator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {showCostCalculator && (
              <div className="mt-3 pt-3 border-t border-blue-100 space-y-3">
                <p className="text-[11px] text-slate-600">
                  Indiquez le montant payé pour le lot et les frais de transport jusqu'à destination. StockFlow calculera automatiquement le coût unitaire réel par article.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                      Quantité payée *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={calcQty}
                      onChange={(e) => setCalcQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                      Prix achat total (FCFA) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={calcTotalPurchase}
                      onChange={(e) => setCalcTotalPurchase(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Ex: 50000"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-0.5 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-amber-600" />
                      <span>Frais Transport</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={calcShippingCost}
                      onChange={(e) => setCalcShippingCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Ex: 5000"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Explication pédagogique automatique */}
                {calcQty > 0 && (
                  <div className="bg-white rounded-lg p-2.5 border border-blue-200/80 text-[11px] space-y-1.5">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>• Prix d'achat brut par article :</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {Math.round(calcTotalPurchase / calcQty).toLocaleString('fr-FR')} FCFA / pc
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({calcTotalPurchase.toLocaleString('fr-FR')} ÷ {calcQty})
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>• Frais de transport par article :</span>
                      <span className="font-mono font-semibold text-amber-700">
                        +{Math.round(calcShippingCost / calcQty).toLocaleString('fr-FR')} FCFA / pc
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({calcShippingCost.toLocaleString('fr-FR')} ÷ {calcQty})
                        </span>
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center font-bold text-xs text-blue-900">
                      <span>🎯 Coût de Revient Unitaire Réel :</span>
                      <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {Math.round((calcTotalPurchase + calcShippingCost) / calcQty).toLocaleString('fr-FR')} FCFA / pièce
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 text-right">
                      Total décaissé pour {calcQty} articles : {(calcTotalPurchase + calcShippingCost).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                )}

                {/* Bouton d'application rapide */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const unitCost = Math.round((calcTotalPurchase + calcShippingCost) / Math.max(1, calcQty));
                      setCostPrice(unitCost);
                      if (!salePrice || salePrice <= unitCost) {
                        setSalePrice(Math.round(unitCost * 1.3));
                      }
                      setAppliedSuccess(true);
                      setTimeout(() => setAppliedSuccess(false), 2500);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
                  >
                    {appliedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Appliqué au prix d'achat !</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Appliquer comme Prix d'achat ({Math.round((calcTotalPurchase + calcShippingCost) / Math.max(1, calcQty)).toLocaleString('fr-FR')} FCFA)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Prix d'achat (FCFA)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 750"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Prix de vente (FCFA)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 1250"
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
