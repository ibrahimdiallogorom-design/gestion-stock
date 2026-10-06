import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { MovementType } from '../types';

export const MovementModal: React.FC = () => {
  const {
    products,
    movementModal,
    closeMovementModal,
    recordMovement,
    currentUser,
  } = useStock();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [type, setType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('Réception commande fournisseur');
  const [operator, setOperator] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (movementModal.isOpen) {
      const initialId = movementModal.productId || (products[0]?.id ?? '');
      setSelectedProductId(initialId);
      const initialType = movementModal.defaultType || 'IN';
      setType(initialType);
      setQuantity(1);
      setOperator(currentUser?.displayName || 'Opérateur Boutique');
      setNotes('');
      setError(null);

      if (initialType === 'IN') {
        setReason('Réception commande fournisseur');
      } else if (initialType === 'OUT') {
        setReason('Vente comptoir boutique');
      } else if (initialType === 'RETURN') {
        setReason('Retour client en magasin');
      } else {
        setReason('Ajustement inventaire physique');
      }
    }
  }, [movementModal, products, currentUser]);

  if (!movementModal.isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = currentProduct?.quantity ?? 0;

  let newStockPreview = currentStock;
  if (type === 'IN' || type === 'RETURN') {
    newStockPreview = currentStock + (quantity || 0);
  } else if (type === 'OUT') {
    newStockPreview = currentStock - (quantity || 0);
  } else if (type === 'ADJUSTMENT') {
    newStockPreview = quantity || 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProductId) {
      setError('Veuillez sélectionner un article.');
      return;
    }

    if (quantity <= 0 && type !== 'ADJUSTMENT') {
      setError('La quantité doit être supérieure à zéro.');
      return;
    }

    if (type === 'OUT' && quantity > currentStock) {
      setError(`Quantité insuffisante en stock (${currentStock} disponible).`);
      return;
    }

    recordMovement(
      selectedProductId,
      type,
      quantity,
      reason,
      operator || 'Opérateur Boutique',
      notes
    );
    closeMovementModal();
  };

  const reasonsByType: Record<MovementType, string[]> = {
    IN: [
      'Réception commande fournisseur',
      'Réassort planifié',
      'Transfert inter-dépôt entrant',
      'Production interne',
    ],
    OUT: [
      'Vente comptoir boutique',
      'Commande e-commerce expédiée',
      'Casse ou avarie constatée',
      'Péremption ou démarque inconnue',
      'Échantillon ou dotation',
    ],
    ADJUSTMENT: [
      'Ajustement inventaire physique',
      'Régularisation suite à écart de comptage',
      'Correction suite à erreur de référence',
    ],
    RETURN: [
      'Retour client en magasin (échange/remboursement)',
      'Retour de prêt ou démonstration',
      'Retour fournisseur suite à refus',
    ],
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Enregistrer un Mouvement de Stock
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Traçabilité immédiate avec mise à jour du niveau d'inventaire
            </p>
          </div>
          <button
            onClick={closeMovementModal}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Movement Type Selector */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Type d'opération
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('IN');
                  setReason(reasonsByType.IN[0]);
                }}
                className={`py-2 px-2 text-center rounded-lg border font-medium flex flex-col items-center gap-1 transition-all ${
                  type === 'IN'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Entrée</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('OUT');
                  setReason(reasonsByType.OUT[0]);
                }}
                className={`py-2 px-2 text-center rounded-lg border font-medium flex flex-col items-center gap-1 transition-all ${
                  type === 'OUT'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-1 ring-rose-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Sortie</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('RETURN');
                  setReason(reasonsByType.RETURN[0]);
                }}
                className={`py-2 px-2 text-center rounded-lg border font-medium flex flex-col items-center gap-1 transition-all ${
                  type === 'RETURN'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Retour</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('ADJUSTMENT');
                  setReason(reasonsByType.ADJUSTMENT[0]);
                }}
                className={`py-2 px-2 text-center rounded-lg border font-medium flex flex-col items-center gap-1 transition-all ${
                  type === 'ADJUSTMENT'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Ajustement</span>
              </button>
            </div>
          </div>

          {/* Product Select */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Article concerné
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stock actuel : {p.quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Stock Preview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                {type === 'ADJUSTMENT' ? 'Nouveau stock réel' : 'Quantité du mouvement'}
              </label>
              <input
                type="number"
                min={type === 'ADJUSTMENT' ? 0 : 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-500 block mb-1">
                Prévisualisation Stock
              </label>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700 font-mono tabular-nums flex items-center justify-between border border-slate-200/60">
                <span>{currentStock}</span>
                <span className="text-slate-400">→</span>
                <span
                  className={`font-bold ${
                    newStockPreview < (currentProduct?.minThreshold ?? 0)
                      ? 'text-rose-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {newStockPreview}
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Motif de l'opération
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Précisez le motif..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
              <div className="flex flex-wrap gap-1">
                {reasonsByType[type].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="text-[10px] text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Operator and Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Opérateur / Vendeur
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Commentaire (optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Réf BL, N° de ticket..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeMovementModal}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs shadow-blue-600/20 transition-colors"
            >
              Valider le mouvement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
