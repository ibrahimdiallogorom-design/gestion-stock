import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  Banknote,
  Building2,
  CreditCard,
  Clock,
  BadgePercent,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product, PaymentMethod, CartItem } from '../types';

interface DirectSaleLine {
  product: Product;
  quantity: number;
  unitPrice: number;
}

const fmtFCFA = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

export const DirectSaleModal: React.FC = () => {
  const { products, directSaleModal, closeDirectSaleModal, processSale, activeAppUser } = useStock();

  const [lines, setLines] = useState<DirectSaleLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [acompteInput, setAcompteInput] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedTicket, setCompletedTicket] = useState<{
    ticketNumber: string;
    total: number;
    items: DirectSaleLine[];
    paymentMethod: PaymentMethod;
    customerName?: string;
    acompte?: number;
    remaining?: number;
  } | null>(null);

  useEffect(() => {
    if (directSaleModal.isOpen) {
      setError(null);
      setCompletedTicket(null);
      setSearchQuery('');
      setPaymentMethod('CASH');
      setAcompteInput('');
      setCustomerName('');

      if (directSaleModal.productId) {
        const found = products.find((p) => p.id === directSaleModal.productId);
        if (found && found.quantity > 0) {
          setLines([
            {
              product: found,
              quantity: 1,
              unitPrice: Number(found.salePrice) || 0,
            },
          ]);
        } else {
          setLines([]);
        }
      } else {
        setLines([]);
      }
    }
  }, [directSaleModal.isOpen, directSaleModal.productId, products]);

  const availableProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products
      .filter((p) => p.quantity > 0)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [products, searchQuery]);

  if (!directSaleModal.isOpen) return null;

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const acompteVal = Math.max(0, Number(acompteInput) || 0);
  const remainingVal =
    paymentMethod === 'ACOMPTE'
      ? Math.max(0, totalAmount - acompteVal)
      : paymentMethod === 'CREDIT'
      ? totalAmount
      : 0;

  const addProductLine = (prod: Product) => {
    setError(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === prod.id);
      if (existing) {
        if (existing.quantity >= prod.quantity) {
          setError(`Stock maximum atteint au Grand Magasin pour "${prod.name}" (${prod.quantity} disp.).`);
          return prev;
        }
        return prev.map((l) =>
          l.product.id === prod.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          product: prod,
          quantity: 1,
          unitPrice: Number(prod.salePrice) || 0,
        },
      ];
    });
    setSearchQuery('');
  };

  const updateLineQty = (productId: string, newQty: number) => {
    setError(null);
    setLines((prev) =>
      prev.map((l) => {
        if (l.product.id !== productId) return l;
        const maxStock = l.product.quantity;
        const clamped = Math.max(1, Math.min(maxStock, Math.floor(newQty || 1)));
        return { ...l, quantity: clamped };
      })
    );
  };

  const updateLinePrice = (productId: string, newPrice: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.product.id === productId ? { ...l, unitPrice: Math.max(0, newPrice || 0) } : l
      )
    );
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError('Veuillez sélectionner au moins un produit à vendre.');
      return;
    }

    if ((paymentMethod === 'ACOMPTE' || paymentMethod === 'CREDIT') && !customerName.trim()) {
      setError('Veuillez indiquer le nom du client pour un acompte ou un crédit.');
      return;
    }

    setIsSubmitting(true);
    const cartItems: CartItem[] = lines.map((l) => ({
      product: { ...l.product, salePrice: l.unitPrice },
      quantity: l.quantity,
    }));

    const res = await processSale(
      cartItems,
      paymentMethod,
      totalAmount,
      paymentMethod === 'ACOMPTE' ? acompteVal : undefined,
      paymentMethod === 'ACOMPTE' || paymentMethod === 'CREDIT' ? remainingVal : undefined,
      customerName.trim() || undefined,
      'CENTRAL'
    );
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Erreur lors de la validation de la vente.');
      return;
    }

    setCompletedTicket({
      ticketNumber: res.ticketNumber,
      total: totalAmount,
      items: [...lines],
      paymentMethod,
      customerName: customerName.trim() || undefined,
      acompte: paymentMethod === 'ACOMPTE' ? acompteVal : undefined,
      remaining: paymentMethod === 'ACOMPTE' || paymentMethod === 'CREDIT' ? remainingVal : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Vente Directe — Grand Magasin Central</h2>
              <p className="text-xs text-emerald-100">
                Vendez directement sur le stock du Grand Magasin sans passer par la caisse
              </p>
            </div>
          </div>
          <button
            onClick={closeDirectSaleModal}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedTicket ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-950 text-base">
                  Vente enregistrée au Grand Magasin ({completedTicket.ticketNumber})
                </div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Le stock du Grand Magasin, le chiffre d'affaires et la comptabilité ont été mis à jour.
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs bg-slate-50">
              <div className="flex justify-between font-bold text-slate-700 border-b border-slate-200 pb-2">
                <span>Grand Magasin Central</span>
                <span>Ticket #{completedTicket.ticketNumber}</span>
              </div>
              {completedTicket.items.map((it) => (
                <div key={it.product.id} className="flex justify-between text-slate-800 py-0.5">
                  <span>
                    {it.product.name} × {it.quantity}
                  </span>
                  <span className="font-mono font-semibold">
                    {fmtFCFA(it.quantity * it.unitPrice)}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>TOTAL ENCAISSÉ</span>
                <span className="font-mono text-emerald-700">{fmtFCFA(completedTicket.total)}</span>
              </div>
              {completedTicket.customerName && (
                <div className="text-slate-600 pt-1">Client : {completedTicket.customerName}</div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-100"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompletedTicket(null);
                  setLines([]);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                + Nouvelle vente Grand Magasin
              </button>
              <button
                type="button"
                onClick={closeDirectSaleModal}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmSale} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Recherche / Ajout d'un produit du Grand Magasin */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Ajouter un article du Grand Magasin ({products.filter((p) => p.quantity > 0).length} disponibles)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un article par nom, SKU ou catégorie..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {(searchQuery.trim() !== '' || lines.length === 0) && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50">
                  {availableProducts.length === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      Aucun article disponible en stock pour cette recherche.
                    </div>
                  ) : (
                    availableProducts.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => addProductLine(p)}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{p.name}</span>
                          <span className="ml-2 font-mono text-[11px] text-slate-500">{p.sku}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-bold text-[11px]">
                            Stock: {p.quantity}
                          </span>
                          <span className="font-mono font-bold text-emerald-700">
                            {fmtFCFA(p.salePrice)}
                          </span>
                          <Plus className="w-4 h-4 text-emerald-600" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Articles sélectionnés */}
            <div className="space-y-2">
              <div className="font-bold text-slate-700">Articles à vendre ({lines.length})</div>
              {lines.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                  Cliquez sur un article ci-dessus pour l'ajouter à la vente.
                </div>
              ) : (
                <div className="space-y-2">
                  {lines.map((line) => (
                    <div
                      key={line.product.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{line.product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {line.product.sku} · Dispo Grand Magasin :{' '}
                          <strong className="text-slate-800">{line.product.quantity}</strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Quantité */}
                        <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => updateLineQty(line.product.id, line.quantity - 1)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={line.product.quantity}
                            value={line.quantity}
                            onChange={(e) => updateLineQty(line.product.id, parseInt(e.target.value, 10))}
                            className="w-12 text-center font-mono font-bold text-slate-900 py-1 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateLineQty(line.product.id, line.quantity + 1)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Prix unitaire modifiable */}
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">×</span>
                          <input
                            type="number"
                            min={0}
                            value={line.unitPrice}
                            onChange={(e) => updateLinePrice(line.product.id, parseFloat(e.target.value))}
                            title="Prix unitaire (modifiable pour vente en gros ou remise)"
                            className="w-24 px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono font-bold text-right text-slate-900"
                          />
                          <span className="text-[11px] text-slate-500">F</span>
                        </div>

                        {/* Sous-total */}
                        <div className="font-mono font-bold text-emerald-700 min-w-[85px] text-right">
                          {fmtFCFA(line.quantity * line.unitPrice)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLine(line.product.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="Retirer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mode de paiement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Mode de règlement</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['CASH', 'Espèces', <Banknote className="w-3.5 h-3.5" />],
                      ['TRANSFER', 'Mobile/Vir.', <Building2 className="w-3.5 h-3.5" />],
                      ['ACOMPTE', 'Acompte', <BadgePercent className="w-3.5 h-3.5" />],
                      ['CREDIT', 'Crédit', <Clock className="w-3.5 h-3.5" />],
                      ['CARD', 'Carte', <CreditCard className="w-3.5 h-3.5" />],
                    ] as const
                  ).map(([method, label, icon]) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`px-2.5 py-2 rounded-lg border font-semibold flex items-center justify-center gap-1 transition-all ${
                        paymentMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Nom du client {paymentMethod === 'ACOMPTE' || paymentMethod === 'CREDIT' ? '(Obligatoire)' : '(Optionnel)'}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Client Grossiste / Nom & Téléphone"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {paymentMethod === 'ACOMPTE' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={totalAmount}
                      value={acompteInput}
                      onChange={(e) => setAcompteInput(e.target.value)}
                      placeholder="Acompte versé (FCFA)"
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 font-mono font-bold"
                    />
                    <span className="text-[11px] font-mono text-amber-800 whitespace-nowrap">
                      Reste: {fmtFCFA(remainingVal)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total & Bouton Valider */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400">
                  Total à encaisser ({activeAppUser?.fullName || 'Grand Magasin'})
                </div>
                <div className="text-xl font-black font-mono text-emerald-700">
                  {fmtFCFA(totalAmount)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeDirectSaleModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={lines.length === 0 || isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Validation...' : 'Encaisser la Vente'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
