import React, { useState, useMemo } from 'react';
import {
  Lock,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  Building2,
  AlertCircle,
  RotateCcw,
  Receipt,
  UserCheck,
  TrendingUp,
  Clock,
  FileText,
  BadgePercent,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product, CartItem, PaymentMethod } from '../types';
import { CashierLockScreen } from './CashierLockScreen';

interface LastSaleReceipt {
  ticketNumber: string;
  date: string;
  cashier: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  totalAmount: number;
  tenderedAmount?: number;
  changeAmount?: number;
  acompteAmount?: number;
  remainingAmount?: number;
  customerName?: string;
}

const formatFCFA = (val: number) => `${Math.round(val).toLocaleString('fr-FR')} FCFA`;

export const CashierView: React.FC = () => {
  const {
    products,
    isCashierUnlocked,
    lockCashier,
    cashierName,
    cashierSession,
    processSale,
  } = useStock();

  // If cashier terminal is locked, display the secure lock screen
  if (!isCashierUnlocked) {
    return <CashierLockScreen />;
  }

  // POS State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const [acompteInput, setAcompteInput] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<LastSaleReceipt | null>(null);

  // Available categories
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products for quick touch selection
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return;
    setSaleError(null);

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          setSaleError(`Stock maximal atteint pour "${product.name}" (${product.quantity} dispo).`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSaleError(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const liveStock = products.find((p) => p.id === productId)?.quantity ?? 0;
            if (newQty > liveStock) {
              setSaleError(`Quantité limitée au stock disponible (${liveStock}).`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setSaleError(null);
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setTenderedInput('');
    setAcompteInput('');
    setCustomerNameInput('');
    setSaleError(null);
  };

  // Calculations (Direct Totals, TVA column removed per request)
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  // Cash handling
  const tenderedAmount = parseFloat(tenderedInput) || 0;
  const changeToReturn = paymentMethod === 'CASH' && tenderedAmount > 0
    ? Math.max(0, tenderedAmount - cartTotal)
    : 0;
  const isCashInsufficient =
    paymentMethod === 'CASH' && tenderedInput.trim() !== '' && tenderedAmount < cartTotal;

  // Acompte & Credit calculations
  const parsedAcompte = parseFloat(acompteInput) || 0;
  const currentAcompte = paymentMethod === 'CREDIT'
    ? (acompteInput.trim() !== '' ? Math.max(0, parsedAcompte) : 0)
    : Math.max(0, parsedAcompte);
  const currentRemaining = Math.max(0, cartTotal - currentAcompte);

  const isAcompteInvalid =
    paymentMethod === 'ACOMPTE' &&
    (acompteInput.trim() === '' || currentAcompte <= 0 || currentAcompte > cartTotal);

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSaleError(null);

    if (paymentMethod === 'CASH' && tenderedAmount > 0 && tenderedAmount < cartTotal) {
      setSaleError('Le montant en espèces donné par le client est inférieur au total.');
      return;
    }

    if (paymentMethod === 'ACOMPTE' && (currentAcompte <= 0 || currentAcompte > cartTotal)) {
      setSaleError('Veuillez saisir un acompte valide (supérieur à 0 et inférieur ou égal au total).');
      return;
    }

    if (paymentMethod === 'CREDIT' && !customerNameInput.trim()) {
      setSaleError('Veuillez renseigner le nom ou téléphone du client débiteur pour enregistrer ce crédit.');
      return;
    }

    setIsProcessing(true);
    try {
      const acompteToSave = paymentMethod === 'ACOMPTE' || paymentMethod === 'CREDIT' ? currentAcompte : undefined;
      const remainingToSave = paymentMethod === 'ACOMPTE' || paymentMethod === 'CREDIT' ? currentRemaining : undefined;
      const customerToSave = customerNameInput.trim() || undefined;

      const result = await processSale(
        cart,
        paymentMethod,
        paymentMethod === 'CASH' ? tenderedAmount : undefined,
        acompteToSave,
        remainingToSave,
        customerToSave
      );

      if (result.success) {
        setLastReceipt({
          ticketNumber: result.ticketNumber,
          date: new Date().toLocaleString('fr-FR'),
          cashier: cashierName,
          items: [...cart],
          paymentMethod,
          totalAmount: cartTotal,
          tenderedAmount: paymentMethod === 'CASH' ? tenderedAmount : undefined,
          changeAmount: paymentMethod === 'CASH' ? changeToReturn : undefined,
          acompteAmount: acompteToSave,
          remainingAmount: remainingToSave,
          customerName: customerToSave,
        });
        clearCart();
      } else {
        setSaleError(result.error || 'Erreur lors de la validation de la vente.');
      }
    } catch (err: any) {
      setSaleError(err.message || 'Erreur inattendue.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cashier Session Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-base font-bold text-slate-900">
                Poste de Caisse Ouvert
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                {cashierName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Terminal de vente et encaissement en direct — Stock décrémenté automatiquement.
            </p>
          </div>
        </div>

        {/* Session Metrics & Lock Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Ventes session : <strong>{cashierSession.totalSalesCount}</strong></span>
            <span className="text-slate-300">|</span>
            <span className="font-mono font-semibold text-blue-700">
              {formatFCFA(cashierSession.totalSalesAmount)}
            </span>
          </div>

          <button
            onClick={lockCashier}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all shadow-2xs"
            title="Verrouiller la caisse immédiatement (nécessite le code PIN pour réouvrir)"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Verrouiller la Caisse</span>
          </button>
        </div>
      </div>

      {/* Main Register Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection Grid (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un article, code-barres ou référence SKU..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Tous les rayons' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              const inStock = product.quantity > 0;
              const isLow = product.quantity > 0 && product.quantity <= product.minThreshold;
              const cartItem = cart.find((i) => i.product.id === product.id);

              return (
                <button
                  key={product.id}
                  disabled={!inStock}
                  onClick={() => addToCart(product)}
                  className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between h-32 ${
                    !inStock
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : cartItem
                      ? 'bg-blue-50/50 border-blue-400 shadow-xs ring-1 ring-blue-500/20 hover:border-blue-500'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                  }`}
                >
                  {cartItem && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                      {cartItem.quantity}
                    </span>
                  )}

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider truncate">
                      {product.sku}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="font-mono text-sm font-bold text-blue-700">
                      {formatFCFA(product.salePrice)}
                    </span>

                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                        !inStock
                          ? 'bg-rose-100 text-rose-800'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {inStock ? `${product.quantity} dispo` : 'Rupture'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {products.length === 0 ? (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs space-y-2">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Le catalogue est actuellement vide</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Tous les produits fictifs ont été supprimés. Rendez-vous dans l'onglet <strong>Inventaire</strong> pour ajouter vos articles réels.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
              Aucun produit ne correspond à votre recherche.
            </div>
          ) : null}
        </div>

        {/* Right Column: Ticket / Cart / Checkout (5/12) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Ticket en Cours ({cart.reduce((s, i) => s + i.quantity, 0)} articles)
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-slate-400 hover:text-rose-600 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vider</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <span className="font-semibold text-slate-800 block truncate">
                    {item.product.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatFCFA(item.product.salePrice)} / u
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-slate-900 text-xs">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-24 text-right font-mono font-bold text-slate-900 shrink-0 ml-2">
                  {formatFCFA(item.product.salePrice * item.quantity)}
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-600">Le panier est vide</p>
                <p className="text-[11px]">Touchez ou cliquez sur un article pour l'ajouter.</p>
              </div>
            )}
          </div>

          {/* Pricing Totals (No TVA - Direct Retail Prices) */}
          {cart.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-slate-200 text-xs">
              <div className="flex justify-between items-baseline pt-1 text-base font-bold text-slate-900">
                <span>Total à Payer</span>
                <span className="font-mono text-xl text-blue-700">
                  {formatFCFA(cartTotal)}
                </span>
              </div>

              {(paymentMethod === 'ACOMPTE' || paymentMethod === 'CREDIT') && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold">Acompte payé :</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {formatFCFA(currentAcompte)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-amber-900 font-bold border-t border-amber-200/70 pt-1.5">
                    <span>Total restant :</span>
                    <span className="font-mono text-base text-amber-800 font-black">
                      {formatFCFA(currentRemaining)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector */}
          {cart.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Mode de Règlement
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-[11px] font-semibold ${
                    paymentMethod === 'CASH'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Espèces</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ACOMPTE')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-[11px] font-semibold ${
                    paymentMethod === 'ACOMPTE'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Acompte</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-[11px] font-semibold ${
                    paymentMethod === 'CREDIT'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Crédit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-[11px] font-semibold ${
                    paymentMethod === 'CARD'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Carte</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-[11px] font-semibold ${
                    paymentMethod === 'TRANSFER'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Virement</span>
                </button>
              </div>

              {/* Cash Change Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Montant Reçu du Client</span>
                    <button
                      type="button"
                      onClick={() => setTenderedInput(cartTotal.toString())}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Montant Exact
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      min={cartTotal}
                      value={tenderedInput}
                      onChange={(e) => setTenderedInput(e.target.value)}
                      placeholder={formatFCFA(cartTotal)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    {[2000, 5000, 10000, 20000].map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setTenderedInput(bill.toString())}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {bill.toLocaleString('fr-FR')} F
                      </button>
                    ))}
                  </div>

                  {tenderedAmount > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <span className="font-semibold text-slate-700">À Rendre au Client :</span>
                      <span
                        className={`font-mono text-sm font-bold ${
                          isCashInsufficient ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isCashInsufficient ? 'Montant insuffisant' : formatFCFA(changeToReturn)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Acompte Handler */}
              {paymentMethod === 'ACOMPTE' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom / Téléphone du Client <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <input
                      type="text"
                      value={customerNameInput}
                      onChange={(e) => setCustomerNameInput(e.target.value)}
                      placeholder="Ex: M. Oumar Sawadogo (70 00 00 00)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Acompte payé</span>
                      <span className="text-[11px] text-slate-500">Max: {formatFCFA(cartTotal)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={cartTotal}
                      value={acompteInput}
                      onChange={(e) => setAcompteInput(e.target.value)}
                      placeholder="Saisir l'acompte payé..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <div className="flex gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setAcompteInput(Math.round(cartTotal * 0.25).toString())}
                        className="flex-1 py-1 px-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono hover:bg-slate-100"
                      >
                        25% ({formatFCFA(cartTotal * 0.25)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcompteInput(Math.round(cartTotal * 0.5).toString())}
                        className="flex-1 py-1 px-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono hover:bg-slate-100"
                      >
                        50% ({formatFCFA(cartTotal * 0.5)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcompteInput(Math.round(cartTotal * 0.75).toString())}
                        className="flex-1 py-1 px-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono hover:bg-slate-100"
                      >
                        75% ({formatFCFA(cartTotal * 0.75)})
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Acompte payé :</span>
                      <span className="font-mono font-bold text-emerald-800">{formatFCFA(currentAcompte)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-900 border-t border-emerald-200/60 pt-1">
                      <span>Total restant :</span>
                      <span className="font-mono text-sm text-amber-700">{formatFCFA(currentRemaining)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Crédit Handler */}
              {paymentMethod === 'CREDIT' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom / Téléphone du Client Débiteur <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerNameInput}
                      onChange={(e) => setCustomerNameInput(e.target.value)}
                      placeholder="Ex: M. Diallo Ibrahim (01 02 03 04)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Acompte payé (Optionnel)</span>
                      <span className="text-[11px] text-slate-400">0 si crédit à 100%</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={cartTotal}
                      value={acompteInput}
                      onChange={(e) => setAcompteInput(e.target.value)}
                      placeholder="0 FCFA"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Acompte payé :</span>
                      <span className="font-mono font-bold text-emerald-800">{formatFCFA(currentAcompte)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-900 border-t border-amber-200/60 pt-1">
                      <span>Total restant :</span>
                      <span className="font-mono text-sm text-amber-700">{formatFCFA(currentRemaining)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {saleError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{saleError}</span>
            </div>
          )}

          {/* Validation CTA */}
          <button
            type="button"
            disabled={cart.length === 0 || isProcessing || isCashInsufficient || isAcompteInvalid}
            onClick={handleCheckout}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs ${
              cart.length === 0 || isProcessing || isCashInsufficient || isAcompteInvalid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : paymentMethod === 'ACOMPTE'
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25'
                : paymentMethod === 'CREDIT'
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/25'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Enregistrement en cours...'
                : paymentMethod === 'ACOMPTE'
                ? `Valider Acompte (${formatFCFA(currentAcompte)} payé | Restant: ${formatFCFA(currentRemaining)})`
                : paymentMethod === 'CREDIT'
                ? `Valider Vente à Crédit (Total Restant: ${formatFCFA(currentRemaining)})`
                : `Encaisser & Valider (${formatFCFA(cartTotal)})`}
            </span>
          </button>
        </div>
      </div>

      {/* Ticket / Receipt Modal */}
      {lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 font-mono text-xs text-slate-800">
            {/* Thermal Ticket Styling */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <Receipt className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <h3 className="font-bold text-base text-slate-900 font-sans">
                BOUTIQUE VISIONTECH
              </h3>
              <p className="text-[11px] text-slate-500 font-sans">Vente Comptoir Magasin</p>
              <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                <div>Ticket N° : <strong>{lastReceipt.ticketNumber}</strong></div>
                <div>Date : {lastReceipt.date}</div>
                <div>Caissier : {lastReceipt.cashier}</div>
              </div>
            </div>

            {/* Receipt Items */}
            <div className="space-y-1.5 py-2 border-b border-dashed border-slate-300">
              {lastReceipt.items.map((it) => (
                <div key={it.product.id} className="flex justify-between items-start">
                  <div className="pr-2 truncate">
                    <span>{it.quantity}x {it.product.name}</span>
                  </div>
                  <span className="font-bold shrink-0">
                    {formatFCFA(it.product.salePrice * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Details */}
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Mode règlement :</span>
                <span className="font-bold text-slate-900">
                  {lastReceipt.paymentMethod === 'CASH'
                    ? 'Espèces'
                    : lastReceipt.paymentMethod === 'ACOMPTE'
                    ? 'Acompte'
                    : lastReceipt.paymentMethod === 'CREDIT'
                    ? 'Crédit'
                    : lastReceipt.paymentMethod === 'CARD'
                    ? 'Carte Bancaire'
                    : 'Virement / Mobile Money'}
                </span>
              </div>

              {lastReceipt.customerName && (
                <div className="flex justify-between">
                  <span>Client :</span>
                  <span className="font-bold text-slate-900">{lastReceipt.customerName}</span>
                </div>
              )}

              {lastReceipt.paymentMethod === 'CASH' && lastReceipt.tenderedAmount !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span>Reçu client :</span>
                    <span>{formatFCFA(lastReceipt.tenderedAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Rendu monnaie :</span>
                    <span>{formatFCFA(lastReceipt.changeAmount || 0)}</span>
                  </div>
                </>
              )}

              {(lastReceipt.paymentMethod === 'ACOMPTE' || lastReceipt.paymentMethod === 'CREDIT') && (
                <>
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Acompte payé :</span>
                    <span className="font-mono">{formatFCFA(lastReceipt.acompteAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-700">
                    <span>Total restant :</span>
                    <span className="font-mono">{formatFCFA(lastReceipt.remainingAmount || 0)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                <span>TOTAL :</span>
                <span>{formatFCFA(lastReceipt.totalAmount)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-2">
              Merci de votre visite et à bientôt !
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100 font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
              <button
                onClick={() => setLastReceipt(null)}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Nouvelle Vente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
