import React, { useState, useEffect } from 'react';
import { X, Share2, Building2, Store, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';
import { useStock } from '../context/StockContext';

export const DistributionModal: React.FC = () => {
  const {
    distributionModal,
    closeDistributionModal,
    products,
    appUsers,
    distributeProduct,
    recallProduct,
  } = useStock();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [actionType, setActionType] = useState<'DISTRIBUTE' | 'RECALL'>('DISTRIBUTE');
  const [notes, setNotes] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cashiers = appUsers.filter((u) => u.role === 'CASHIER');

  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (distributionModal.isOpen) {
      if (distributionModal.productId) {
        setSelectedProductId(distributionModal.productId);
      } else if (products.length > 0) {
        setSelectedProductId(products[0].id);
      }

      if (distributionModal.defaultTargetUserId) {
        setTargetUserId(distributionModal.defaultTargetUserId);
      } else if (cashiers.length > 0) {
        setTargetUserId(cashiers[0].id);
      }

      setQuantity(1);
      setActionType('DISTRIBUTE');
      setNotes('');
      setStatusMessage(null);
      setIsSubmitting(false);
      setIsConfirming(false);
    }
  }, [distributionModal.isOpen, distributionModal.productId, distributionModal.defaultTargetUserId, products]);

  if (!distributionModal.isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId);
  const currentCashier = cashiers.find((u) => u.id === targetUserId);

  const centralStock = currentProduct
    ? (currentProduct.centralQuantity !== undefined ? currentProduct.centralQuantity : currentProduct.quantity)
    : 0;

  const cashierHeldStock = currentProduct && targetUserId
    ? (currentProduct.distributedQuantities?.[targetUserId] || 0)
    : 0;

  const maxQuantity = actionType === 'DISTRIBUTE' ? centralStock : cashierHeldStock;

  const numericQuantity = typeof quantity === 'string'
    ? (quantity.trim() === '' ? 0 : parseInt(quantity, 10) || 0)
    : Number(quantity) || 0;

  const costTotal = (currentProduct?.costPrice || 0) * numericQuantity;
  const saleTotal = (currentProduct?.salePrice || 0) * numericQuantity;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!selectedProductId) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner un article.' });
      return;
    }

    if (!targetUserId) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner une boutique ou un caissier.' });
      return;
    }

    if (numericQuantity <= 0) {
      setStatusMessage({ type: 'error', text: 'Veuillez saisir une quantité supérieure à zéro.' });
      return;
    }

    if (numericQuantity > maxQuantity) {
      setStatusMessage({
        type: 'error',
        text: `Quantité impossible : maximum disponible = ${maxQuantity} unités.`,
      });
      return;
    }

    // Go to confirmation step
    setIsConfirming(true);
  };

  const handleExecuteTransfer = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (actionType === 'DISTRIBUTE') {
        const res = await distributeProduct(selectedProductId, targetUserId, numericQuantity, notes);
        if (res.success) {
          setStatusMessage({ type: 'success', text: `Marchandises octroyées avec succès ! ${res.message}` });
          setTimeout(() => {
            closeDistributionModal();
          }, 1500);
        } else {
          setStatusMessage({ type: 'error', text: res.message });
          setIsConfirming(false);
        }
      } else {
        const res = await recallProduct(selectedProductId, targetUserId, numericQuantity, notes);
        if (res.success) {
          setStatusMessage({ type: 'success', text: `Marchandises rapatriées avec succès ! ${res.message}` });
          setTimeout(() => {
            closeDistributionModal();
          }, 1500);
        } else {
          setStatusMessage({ type: 'error', text: res.message });
          setIsConfirming(false);
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Une erreur est survenue.' });
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Distribution de Marchandises</h3>
              <p className="text-xs text-blue-200/80">
                Grand Magasin Central ➔ Vendeurs & Sous-boutiques
              </p>
            </div>
          </div>
          <button
            onClick={closeDistributionModal}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Direction Switch */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setActionType('DISTRIBUTE');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all ${
              actionType === 'DISTRIBUTE'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>Distribuer au Vendeur (Dotation)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActionType('RECALL');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all ${
              actionType === 'RECALL'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au Grand Magasin</span>
          </button>
        </div>

        {/* Form Body or Confirmation Step */}
        {isConfirming ? (
          <div className="p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    {actionType === 'DISTRIBUTE' ? 'Confirmation d’Octroi de Marchandises' : 'Confirmation de Rapatriement'}
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Veuillez cliquer sur <strong>"Confirmer"</strong> pour valider l'affectation de ces marchandises.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-emerald-200 text-xs space-y-2 font-medium">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500">Article :</span>
                  <span className="font-bold text-slate-900">{currentProduct?.name} ({currentProduct?.sku})</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500">Boutique bénéficiaire :</span>
                  <span className="font-bold text-emerald-700">{currentCashier?.storeName || currentCashier?.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500">Quantité {actionType === 'DISTRIBUTE' ? 'offerte' : 'rapatriée'} :</span>
                  <span className="font-bold font-mono text-base text-slate-900">{numericQuantity} unité(s)</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 border-t border-slate-100 pt-2">
                  <span className="text-slate-500">Valeur marchande :</span>
                  <span className="font-bold font-mono text-emerald-700 text-sm">{saleTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800">
                  ℹ️ <strong>Règle de gestion :</strong> Le grand total reste conservé dans la boutique centrale ({currentProduct?.quantity} pièces). La déduction de stock interviendra lors des ventes en caisse.
                </div>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              >
                &larr; Modifier la saisie
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteTransfer}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Enregistrement...' : 'Confirmer'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePreSubmit} className="p-5 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Product Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Article à {actionType === 'DISTRIBUTE' ? 'distribuer' : 'rapatrier'}
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
            >
              {products.length === 0 ? (
                <option value="">Aucun article dans le catalogue</option>
              ) : (
                products.map((p) => {
                  const cStock = p.quantity;
                  const distTotal = Object.values(p.distributedQuantities || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                  return (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} — Stock Magasin: {cStock} pcs | Dotations: {distTotal} pcs | {p.salePrice.toLocaleString('fr-FR')} F
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Target Cashier Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {actionType === 'DISTRIBUTE' ? 'Vendeur / Caissier destinataire' : 'Vendeur / Caissier source'}
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
            >
              {cashiers.map((c) => {
                const held = currentProduct?.distributedQuantities?.[c.id] || 0;
                return (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.storeName || c.username}) — Actuellement en caisse: {held} pièce(s)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Stock Balances Preview Cards */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Grand Magasin Central :
              </span>
              <p className="text-sm font-bold font-mono text-slate-900">
                {centralStock} unité(s)
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                Chez {currentCashier?.fullName || 'ce vendeur'} :
              </span>
              <p className="text-sm font-bold font-mono text-slate-900">
                {cashierHeldStock} unité(s)
              </p>
            </div>
          </div>

          {/* Quantity Input with Saisie Libre (Fermeture du défilement) */}
          <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Quantité à {actionType === 'DISTRIBUTE' ? 'attribuer' : 'réintégrer'}</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Dispo : <strong className="text-slate-900 font-mono font-bold">{maxQuantity}</strong> unité(s)
              </span>
            </div>

            {/* Stepper Input + Boutons - / + / 0 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(0, numericQuantity - 1))}
                disabled={numericQuantity <= 0}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700 text-lg shadow-xs transition-colors shrink-0"
                title="Diminuer de 1"
              >
                -
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantity}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setQuantity('');
                      return;
                    }
                    const clean = raw.replace(/[^0-9]/g, '');
                    if (clean === '') {
                      setQuantity('');
                    } else {
                      const parsed = parseInt(clean, 10);
                      setQuantity(Math.min(parsed, maxQuantity));
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-lg font-bold font-mono text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                />
                {quantity !== '' && numericQuantity > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(0)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 rounded font-medium transition-colors"
                    title="Remettre à 0"
                  >
                    Effacer
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setQuantity(Math.min(maxQuantity, numericQuantity + 1))}
                disabled={numericQuantity >= maxQuantity}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700 text-lg shadow-xs transition-colors shrink-0"
                title="Augmenter de 1"
              >
                +
              </button>
            </div>

            {/* Raccourcis Rapides */}
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setQuantity(0)}
                className="py-1 px-2.5 text-[11px] font-mono bg-slate-200/70 hover:bg-slate-300 rounded-lg text-slate-700 font-medium"
              >
                0
              </button>
              {[1, 5, 10, 20].map((step) => (
                <button
                  key={step}
                  type="button"
                  disabled={step > maxQuantity}
                  onClick={() => setQuantity(Math.min(step, maxQuantity))}
                  className="flex-1 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  +{step}
                </button>
              ))}
              {maxQuantity > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(maxQuantity)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 whitespace-nowrap"
                >
                  Tout ({maxQuantity})
                </button>
              )}
            </div>
          </div>

          {/* Financial Value of Batch */}
          {currentProduct && numericQuantity > 0 && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Coût d'achat du lot :</span>
                <span className="font-mono font-semibold text-slate-900">
                  {costTotal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between font-bold text-blue-900 border-t border-blue-200/60 pt-1">
                <span>Valeur marchande en vente :</span>
                <span className="font-mono text-sm text-blue-700">
                  {saleTotal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note / Motif du transfert <span className="text-slate-400 font-normal">(Facultatif)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Dotation d'ouverture, réapprovisionnement samedi, foire..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Submit Buttons (Toujours bien visibles en bas) */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <button
              type="button"
              onClick={closeDistributionModal}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || maxQuantity <= 0 || numericQuantity <= 0}
              className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${
                actionType === 'DISTRIBUTE'
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300'
                  : 'bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {actionType === 'DISTRIBUTE'
                  ? `Valider la quantité (${numericQuantity} pcs)`
                  : `Valider le retour (${numericQuantity} pcs)`}
              </span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
