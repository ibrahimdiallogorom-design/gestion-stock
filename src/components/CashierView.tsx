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
  Store,
  Package,
  Tag,
  ArrowDownRight,
  PackagePlus,
  Sparkles,
  Check,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product, CartItem, PaymentMethod, STANDARD_CATEGORIES } from '../types';
import { CashierLockScreen } from './CashierLockScreen';

interface LastSaleReceipt {
  ticketNumber: string;
  date: string;
  cashier: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  totalAmount: number;
  originalTotalAmount?: number;
  discountAmount?: number;
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
    activeAppUser,
    appUsers,
    updateProduct,
    recordMovement,
    distributeProduct,
  } = useStock();

  const isRoleCashier = activeAppUser?.role === 'CASHIER';

  // If cashier terminal is locked and user is a Cashier, display the secure lock screen
  if (!isCashierUnlocked && isRoleCashier) {
    return <CashierLockScreen />;
  }

  const cashiers = useMemo(() => appUsers.filter((u) => u.role === 'CASHIER'), [appUsers]);

  // Determine which boutique cashier this POS terminal represents:
  // - If Cashier: strictly locked to activeAppUser.id
  // - If Admin: defaults to 'CENTRAL' (Grand Magasin Central) so Admin can sell directly from Grand Magasin, or choose a cashier boutique
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>(() => {
    if (isRoleCashier && activeAppUser?.id) return activeAppUser.id;
    return 'CENTRAL';
  });

  const isCentralSelected = !isRoleCashier && selectedBoutiqueId === 'CENTRAL';

  const effectiveCashier = useMemo(() => {
    if (isRoleCashier && activeAppUser) return activeAppUser;
    if (selectedBoutiqueId === 'CENTRAL') return null;
    const found = cashiers.find((c) => c.id === selectedBoutiqueId);
    return found || cashiers[0] || null;
  }, [isRoleCashier, activeAppUser, cashiers, selectedBoutiqueId]);

  const effectiveCashierId = isCentralSelected ? 'CENTRAL' : effectiveCashier?.id;

  // Available stock: Grand Magasin stock if CENTRAL selected, else articles octroyés à cette boutique
  const getAvailableStock = (prod: Product) => {
    if (isCentralSelected) {
      return prod.quantity || 0;
    }
    if (effectiveCashierId && prod.distributedQuantities?.[effectiveCashierId] !== undefined) {
      return prod.distributedQuantities[effectiveCashierId] || 0;
    }
    return 0;
  };

  // Compute total stock assigned to this cashier boutique (or Grand Magasin)
  const cashierInventoryStats = useMemo(() => {
    if (!effectiveCashierId) return null;
    let units = 0;
    let value = 0;
    products.forEach((p) => {
      const q = isCentralSelected ? (p.quantity || 0) : (p.distributedQuantities?.[effectiveCashierId] || 0);
      if (q > 0) {
        units += q;
        value += q * p.salePrice;
      }
    });
    return { units, value };
  }, [effectiveCashierId, isCentralSelected, products]);

  // Count total articles allocated to this boutique
  const totalAllocatedArticlesCount = useMemo(() => {
    if (!effectiveCashierId) return 0;
    if (isCentralSelected) return products.filter((p) => (p.quantity || 0) > 0).length;
    return products.filter((p) => (p.distributedQuantities?.[effectiveCashierId] || 0) > 0).length;
  }, [effectiveCashierId, isCentralSelected, products]);

  // POS Sub-Tab: 'CATALOG' (Vente standard) vs 'REASSORT' (Réassort & Diminuer le prix client)
  const [cashierSubTab, setCashierSubTab] = useState<'CATALOG' | 'REASSORT'>('CATALOG');

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
  const [saleSuccessToast, setSaleSuccessToast] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<LastSaleReceipt | null>(null);

  // Per-item custom price editing in Cart or in Réassort tab
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [customCartPriceInput, setCustomCartPriceInput] = useState<string>('');
  const [globalTargetTotalInput, setGlobalTargetTotalInput] = useState<string>('');
  const [showGlobalDiscountBox, setShowGlobalDiscountBox] = useState<boolean>(false);

  // State inside the "Réassort & Diminuer Prix" tab
  const [reassortPriceInputs, setReassortPriceInputs] = useState<Record<string, string>>({});
  const [reassortQtyInputs, setReassortQtyInputs] = useState<Record<string, string>>({});
  const [reassortShowAllCatalog, setReassortShowAllCatalog] = useState<boolean>(true);

  const showTempToast = (msg: string) => {
    setSaleSuccessToast(msg);
    setTimeout(() => {
      setSaleSuccessToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Available categories
  const categories = useMemo(() => {
    const allocatedProds = isCentralSelected
      ? products.filter((p) => (p.quantity || 0) > 0)
      : effectiveCashierId
      ? products.filter((p) => (p.distributedQuantities?.[effectiveCashierId] || 0) > 0)
      : products;
    const cats = Array.from(new Set(allocatedProds.map((p) => p.category).filter(Boolean)));
    return ['all', ...cats];
  }, [products, effectiveCashierId, isCentralSelected]);

  // Filtered products for quick touch selection:
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (isCentralSelected) {
        if ((p.quantity || 0) <= 0) return false;
      } else if (effectiveCashierId) {
        const myQty = p.distributedQuantities?.[effectiveCashierId] || 0;
        if (myQty <= 0) return false; // Strictly hidden in standard sale catalog!
      }
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory, effectiveCashierId, isCentralSelected]);

  // Filtered products for the "Réassort & Diminuer Prix" tab (can show all products so user can restock out-of-stock items too!)
  const reassortProducts = useMemo(() => {
    return products.filter((p) => {
      if (!reassortShowAllCatalog) {
        const avail = getAvailableStock(p);
        if (avail <= 0) return false;
      }
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory, reassortShowAllCatalog, effectiveCashierId, isCentralSelected]);

  // Get original catalog price for a product
  const getCatalogSalePrice = (productId: string, fallbackPrice: number) => {
    const found = products.find((p) => p.id === productId);
    return found ? found.salePrice : fallbackPrice;
  };

  // Cart operations (supports optional customPrice for negotiated customer discount)
  const addToCart = (product: Product, customUnitPrice?: number) => {
    const available = getAvailableStock(product);
    if (available <= 0) {
      setSaleError(`Rupture de stock pour "${product.name}" (${isRoleCashier ? 'en caisse' : 'en stock'}). Utilisez le bouton "+ Réassort" pour ajouter du stock.`);
      return;
    }
    setSaleError(null);

    const effectivePrice =
      customUnitPrice !== undefined && Number.isFinite(customUnitPrice) && customUnitPrice >= 0
        ? Math.round(customUnitPrice)
        : product.salePrice;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= available) {
          setSaleError(`Stock maximal atteint pour "${product.name}" (${available} disponible${isRoleCashier ? ' dans votre caisse' : ''}).`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                product:
                  customUnitPrice !== undefined
                    ? { ...item.product, salePrice: effectivePrice }
                    : item.product,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product: { ...product, salePrice: effectivePrice },
          quantity: 1,
        },
      ];
    });

    if (customUnitPrice !== undefined && effectivePrice !== product.salePrice) {
      showTempToast(
        `"${product.name}" ajouté au ticket au prix client négocié de ${formatFCFA(effectivePrice)} (au lieu de ${formatFCFA(product.salePrice)})`
      );
    }
  };

  // Update unit price of an item already in the cart (customer price reduction)
  const updateCartItemPrice = (productId: string, newUnitPrice: number) => {
    const cleanPrice = Math.max(0, Math.round(newUnitPrice));
    setSaleError(null);
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              product: {
                ...item.product,
                salePrice: cleanPrice,
              },
            }
          : item
      )
    );
  };

  // Apply a global negotiated total or global discount across the cart
  const applyNegotiatedCartTotal = (targetTotal: number) => {
    if (cart.length === 0) return;
    const cleanTarget = Math.max(0, Math.round(targetTotal));
    const currentCatalogTotal = cart.reduce(
      (sum, item) => sum + getCatalogSalePrice(item.product.id, item.product.salePrice) * item.quantity,
      0
    );
    if (currentCatalogTotal <= 0) return;

    const ratio = cleanTarget / currentCatalogTotal;
    setCart((prev) =>
      prev.map((item) => {
        const basePrice = getCatalogSalePrice(item.product.id, item.product.salePrice);
        const newUnitPrice = Math.max(0, Math.round(basePrice * ratio));
        return {
          ...item,
          product: {
            ...item.product,
            salePrice: newUnitPrice,
          },
        };
      })
    );
    setShowGlobalDiscountBox(false);
    setGlobalTargetTotalInput('');
    showTempToast(`Prix total du ticket ajusté pour le client : ${formatFCFA(cleanTarget)}`);
  };

  const resetCartPricesToCatalog = () => {
    setCart((prev) =>
      prev.map((item) => ({
        ...item,
        product: {
          ...item.product,
          salePrice: getCatalogSalePrice(item.product.id, item.product.salePrice),
        },
      }))
    );
    showTempToast('Prix du ticket réinitialisés aux tarifs catalogue.');
  };

  // Quick Reassort (add stock) directly from the Réassort tab in Caisse
  const handleQuickReassort = async (product: Product, addQty: number) => {
    const cleanQty = Math.round(addQty);
    if (!Number.isFinite(cleanQty) || cleanQty <= 0) {
      setSaleError('Veuillez saisir une quantité de réassort valide (supérieure à 0).');
      return;
    }
    setSaleError(null);
    try {
      if (isCentralSelected || !effectiveCashierId || effectiveCashierId === 'CENTRAL') {
        await recordMovement(
          product.id,
          'IN',
          cleanQty,
          'Réassort rapide depuis la Caisse',
          cashierName || activeAppUser?.fullName || 'Caisse'
        );
        showTempToast(`Réassort effectué : +${cleanQty} u ajoutées en stock pour "${product.name}".`);
      } else {
        // If a specific boutique is selected, check if central stock has enough, otherwise add to central first then distribute
        const currentCentral = product.centralQuantity ?? product.quantity ?? 0;
        if (currentCentral < cleanQty) {
          const needed = cleanQty - currentCentral;
          await recordMovement(
            product.id,
            'IN',
            needed,
            'Approvisionnement Réassort Caisse',
            cashierName || activeAppUser?.fullName || 'Caisse'
          );
        }
        const res = await distributeProduct(
          product.id,
          effectiveCashierId,
          cleanQty,
          'Réassort direct depuis l\'onglet Réassort de la Caisse'
        );
        if (res.success) {
          showTempToast(`Réassort boutique effectué : +${cleanQty} u pour "${product.name}".`);
        } else {
          setSaleError(res.message);
        }
      }
      setReassortQtyInputs((prev) => ({ ...prev, [product.id]: '' }));
    } catch (e: any) {
      setSaleError(e?.message || 'Erreur lors du réassort.');
    }
  };

  // Update catalog salePrice permanently from the Réassort tab
  const handleSaveCatalogPrice = async (product: Product, newPrice: number) => {
    const cleanPrice = Math.max(0, Math.round(newPrice));
    if (!Number.isFinite(cleanPrice) || cleanPrice <= 0) {
      setSaleError('Veuillez saisir un prix valide supérieur à 0 FCFA.');
      return;
    }
    setSaleError(null);
    await updateProduct(product.id, { salePrice: cleanPrice });
    // Also update in current cart if present
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === product.id
          ? { ...item, product: { ...item.product, salePrice: cleanPrice } }
          : item
      )
    );
    showTempToast(`Nouveau prix enregistré pour "${product.name}" : ${formatFCFA(cleanPrice)}`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSaleError(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const targetProd = products.find((p) => p.id === productId);
            const liveStock = targetProd ? getAvailableStock(targetProd) : 0;
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
    if (editingCartItemId === productId) {
      setEditingCartItemId(null);
    }
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setTenderedInput('');
    setAcompteInput('');
    setCustomerNameInput('');
    setEditingCartItemId(null);
    setShowGlobalDiscountBox(false);
    setGlobalTargetTotalInput('');
    setSaleError(null);
  };

  // Calculations (Direct Totals, TVA column removed per request)
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  const cartCatalogTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + getCatalogSalePrice(item.product.id, item.product.salePrice) * item.quantity,
      0
    );
  }, [cart, products]);

  const totalDiscountGranted = Math.max(0, cartCatalogTotal - cartTotal);

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
        customerToSave,
        effectiveCashierId
      );

      if (result.success) {
        setLastReceipt({
          ticketNumber: result.ticketNumber,
          date: new Date().toLocaleString('fr-FR'),
          cashier: cashierName,
          items: [...cart],
          paymentMethod,
          totalAmount: cartTotal,
          originalTotalAmount: cartCatalogTotal > cartTotal ? cartCatalogTotal : undefined,
          discountAmount: totalDiscountGranted > 0 ? totalDiscountGranted : undefined,
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
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
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
                {isCentralSelected
                  ? 'Grand Magasin Central'
                  : effectiveCashier?.storeName || effectiveCashier?.fullName || cashierName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCentralSelected
                ? 'Vente directe sur le stock global du Grand Magasin Central.'
                : 'Articles cloisonnés : seuls les produits octroyés à cette boutique sont disponibles à la vente.'}
            </p>
          </div>
        </div>

        {/* Session Metrics & Boutique Selector / Lock Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Admin Boutique Selector */}
          {!isRoleCashier && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <Store className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">Vendre depuis :</span>
              <select
                value={selectedBoutiqueId}
                onChange={(e) => {
                  setSelectedBoutiqueId(e.target.value);
                  setCart([]);
                }}
                className="bg-white border border-blue-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none text-xs"
              >
                <option value="CENTRAL">🏢 Grand Magasin Central (Tout le stock)</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏪 {c.storeName || c.fullName} ({c.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          {cashierInventoryStats && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
              <Store className="w-4 h-4 text-indigo-600" />
              <span>Stock boutique : <strong>{cashierInventoryStats.units} pcs</strong></span>
              <span className="text-indigo-300">|</span>
              <span className="font-mono font-bold text-indigo-700">
                {formatFCFA(cashierInventoryStats.value)}
              </span>
            </div>
          )}

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

      {/* Sub-Tabs Navigation Bar inside Caisse: Catalogue Vente vs Onglet Réassort & Diminuer Prix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCashierSubTab('CATALOG')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              cashierSubTab === 'CATALOG'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Catalogue & Vente Rapide</span>
          </button>

          <button
            type="button"
            onClick={() => setCashierSubTab('REASSORT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              cashierSubTab === 'REASSORT'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <BadgePercent className="w-4 h-4" />
            <span>Onglet Réassort & Diminuer le Prix Client</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-white/20 font-mono">
              Remise & Stock
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-[11px] text-slate-500">
          <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Astuce : Vous pouvez diminuer le prix d'un client depuis l'onglet <strong>Réassort</strong> ou directement dans le <strong>Ticket en Cours</strong>.
          </span>
        </div>
      </div>

      {saleSuccessToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saleSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaleSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-800 text-[11px] underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Register Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection Grid OR Réassort & Diminuer Prix Tab (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un article, code-barres ou référence SKU..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {cashierSubTab === 'REASSORT' && (
                <button
                  type="button"
                  onClick={() => setReassortShowAllCatalog((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                    reassortShowAllCatalog
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {reassortShowAllCatalog ? 'Affichage : Tout le catalogue' : 'Affichage : En stock uniquement'}
                </button>
              )}
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

          {cashierSubTab === 'CATALOG' ? (
            <>
              {/* Product Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((product) => {
                  const liveQty = getAvailableStock(product);
                  const inStock = liveQty > 0;
                  const isLow = liveQty > 0 && liveQty <= product.minThreshold;
                  const cartItem = cart.find((i) => i.product.id === product.id);
                  const hasCustomCartPrice =
                    cartItem && cartItem.product.salePrice !== product.salePrice;

                  return (
                    <div
                      key={product.id}
                      className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between min-h-36 ${
                        !inStock
                          ? 'bg-slate-50 border-slate-200 opacity-60'
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

                      <button
                        type="button"
                        disabled={!inStock}
                        onClick={() => addToCart(product)}
                        className="text-left flex-1 flex flex-col justify-between w-full"
                      >
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider truncate">
                            {product.sku}
                          </span>
                          <h3 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5">
                            {product.name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 w-full">
                          <div>
                            {hasCustomCartPrice ? (
                              <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-slate-400 line-through">
                                  {formatFCFA(product.salePrice)}
                                </span>
                                <span className="font-mono text-xs font-bold text-emerald-700">
                                  {formatFCFA(cartItem.product.salePrice)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-sm font-bold text-blue-700">
                                {formatFCFA(product.salePrice)}
                              </span>
                            )}
                          </div>

                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                              !inStock
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {inStock ? `${liveQty} en caisse` : 'Rupture'}
                          </span>
                        </div>
                      </button>

                      {/* Quick link to open this product in Réassort / Diminuer Prix */}
                      <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReassortPriceInputs((prev) => ({
                              ...prev,
                              [product.id]: String(
                                cartItem ? cartItem.product.salePrice : product.salePrice
                              ),
                            }));
                            setSearch(product.name);
                            setCashierSubTab('REASSORT');
                          }}
                          className="w-full py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          title="Diminuer le prix pour le client ou réassortir cet article"
                        >
                          <BadgePercent className="w-3 h-3 text-amber-600" />
                          <span>Diminuer prix / Réassort</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {products.length === 0 ? (
                <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs space-y-2">
                  <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">Le catalogue général est actuellement vide</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Tous les produits fictifs ont été supprimés. Rendez-vous dans l'onglet <strong>Inventaire</strong> pour ajouter vos articles réels.
                  </p>
                </div>
              ) : totalAllocatedArticlesCount === 0 ? (
                <div className="p-10 text-center bg-white border border-dashed border-amber-300 rounded-2xl text-slate-500 text-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    Aucun article n'a encore été octroyé à cette boutique
                  </p>
                  <p className="text-[12px] text-slate-500 max-w-md mx-auto">
                    Le Grand Magasin Central n'a pas encore alloué de stock à <strong>{effectiveCashier?.storeName || effectiveCashier?.fullName || 'cette boutique'}</strong>.
                    Cliquez sur l'onglet <strong>Onglet Réassort & Diminuer le Prix Client</strong> ci-dessus pour réassortir immédiatement.
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
                  Aucun article de votre boutique ne correspond à votre recherche.
                </div>
              ) : null}
            </>
          ) : (
            /* ONGLET RÉASSORT & DIMINUER LE PRIX CLIENT */
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                    <BadgePercent className="w-4 h-4 text-amber-600" />
                    <span>Espace Réassort & Négociation / Diminution de Prix Client</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Si un client négocie une remise, diminuez le prix ci-dessous puis cliquez sur <strong>« Vendre à ce prix au client »</strong> pour l'ajouter directement au ticket avec le tarif réduit.
                  </p>
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-amber-900 hover:bg-amber-100 shrink-0"
                  >
                    Voir tous les articles ({products.length})
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {reassortProducts.map((product) => {
                  const liveQty = getAvailableStock(product);
                  const inStock = liveQty > 0;
                  const rawPriceInput = reassortPriceInputs[product.id];
                  const currentNegotiatedPrice =
                    rawPriceInput !== undefined && rawPriceInput !== ''
                      ? Math.max(0, Math.round(Number(rawPriceInput) || 0))
                      : product.salePrice;
                  const priceDiff = product.salePrice - currentNegotiatedPrice;
                  const isBelowCost = !isRoleCashier && currentNegotiatedPrice < product.costPrice;
                  const rawQtyInput = reassortQtyInputs[product.id] ?? '';

                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-amber-300 transition-all"
                    >
                      {/* Top row: Product info + Stock status */}
                      <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {product.sku}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">
                              {product.category}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-1">
                            {product.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Prix Catalogue</span>
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {formatFCFA(product.salePrice)}
                            </span>
                            {!isRoleCashier && (
                              <span className="block text-[10px] font-mono text-slate-400">
                                Achat : {formatFCFA(product.costPrice)}
                              </span>
                            )}
                          </div>

                          <span
                            className={`text-xs px-2.5 py-1 rounded-xl font-mono font-bold ${
                              inStock
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inStock ? `${liveQty} en stock` : 'Rupture (0)'}
                          </span>
                        </div>
                      </div>

                      {/* Middle section: Diminuer / Ajuster le Prix pour le Client */}
                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                            <ArrowDownRight className="w-4 h-4 text-amber-600" />
                            <span>Diminuer le prix pour le client :</span>
                          </span>
                          {priceDiff > 0 && (
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              Remise client : -{formatFCFA(priceDiff)}
                            </span>
                          )}
                          {priceDiff < 0 && (
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                              Majoration : +{formatFCFA(Math.abs(priceDiff))}
                            </span>
                          )}
                        </div>

                        {/* Quick Reduction Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[250, 500, 1000, 2000, 5000].map((StepDiscount) => (
                            <button
                              key={StepDiscount}
                              type="button"
                              onClick={() => {
                                const nextVal = Math.max(0, currentNegotiatedPrice - StepDiscount);
                                setReassortPriceInputs((prev) => ({
                                  ...prev,
                                  [product.id]: String(nextVal),
                                }));
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-mono font-bold transition-colors"
                            >
                              -{StepDiscount.toLocaleString('fr-FR')} F
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = Math.max(0, Math.round(product.salePrice * 0.9));
                              setReassortPriceInputs((prev) => ({
                                ...prev,
                                [product.id]: String(nextVal),
                              }));
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-mono font-bold transition-colors"
                          >
                            -10%
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setReassortPriceInputs((prev) => ({
                                ...prev,
                                [product.id]: String(product.salePrice),
                              }))
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                          >
                            Prix initial
                          </button>
                        </div>

                        {/* Direct Custom Price Input + Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={
                                rawPriceInput !== undefined
                                  ? rawPriceInput
                                  : String(product.salePrice)
                              }
                              onChange={(e) =>
                                setReassortPriceInputs((prev) => ({
                                  ...prev,
                                  [product.id]: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                              placeholder="Nouveau prix client en FCFA..."
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                              FCFA
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() => addToCart(product, currentNegotiatedPrice)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              inStock
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>
                              Vendre à {formatFCFA(currentNegotiatedPrice)}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveCatalogPrice(product, currentNegotiatedPrice)}
                            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                            title="Enregistrer ce prix comme nouveau prix catalogue permanent"
                          >
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                            <span>Fixer au catalogue</span>
                          </button>
                        </div>

                        {isBelowCost && (
                          <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Attention : Ce prix ({formatFCFA(currentNegotiatedPrice)}) est inférieur au prix d'achat ({formatFCFA(product.costPrice)}).
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Bottom section: Réassort Rapide du Stock */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <PackagePlus className="w-4 h-4 text-blue-600" />
                          <span>Réassort rapide du stock :</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {[1, 5, 10].map((qtyBoost) => (
                            <button
                              key={qtyBoost}
                              type="button"
                              onClick={() => handleQuickReassort(product, qtyBoost)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-mono font-bold transition-colors"
                            >
                              +{qtyBoost} u
                            </button>
                          ))}

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={rawQtyInput}
                              onChange={(e) =>
                                setReassortQtyInputs((prev) => ({
                                  ...prev,
                                  [product.id]: e.target.value,
                                }))
                              }
                              placeholder="Qté..."
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                            />
                            <button
                              type="button"
                              disabled={!rawQtyInput || Number(rawQtyInput) <= 0}
                              onClick={() =>
                                handleQuickReassort(product, Number(rawQtyInput) || 0)
                              }
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              + Réassort
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {reassortProducts.length === 0 && (
                  <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
                    Aucun article trouvé pour "{search}".
                  </div>
                )}
              </div>
            </div>
          )}
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

          {/* Cart Items List with Per-Item Price Negotiation */}
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {cart.map((item) => {
              const catalogPrice = getCatalogSalePrice(item.product.id, item.product.salePrice);
              const isDiscounted = item.product.salePrice < catalogPrice;
              const isEditingThisPrice = editingCartItemId === item.product.id;

              return (
                <div
                  key={item.product.id}
                  className={`p-2.5 rounded-xl border text-xs space-y-2 transition-all ${
                    isDiscounted
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-semibold text-slate-800 block truncate">
                        {item.product.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {isDiscounted && (
                          <span className="text-[10px] text-slate-400 font-mono line-through">
                            {formatFCFA(catalogPrice)}
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-mono font-bold ${
                            isDiscounted ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {formatFCFA(item.product.salePrice)} / u
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingThisPrice) {
                              setEditingCartItemId(null);
                            } else {
                              setEditingCartItemId(item.product.id);
                              setCustomCartPriceInput(String(item.product.salePrice));
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-semibold flex items-center gap-0.5 transition-colors"
                          title="Diminuer ou modifier le prix unitaire pour ce client"
                        >
                          <BadgePercent className="w-2.5 h-2.5 text-amber-700" />
                          <span>{isEditingThisPrice ? 'Fermer' : 'Diminuer prix'}</span>
                        </button>
                      </div>
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

                  {/* Inline Price Reduction Drawer for this Cart Item */}
                  {isEditingThisPrice && (
                    <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900">
                        <span>Nouveau prix unitaire client (Catalogue : {formatFCFA(catalogPrice)})</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateCartItemPrice(item.product.id, catalogPrice);
                            setCustomCartPriceInput(String(catalogPrice));
                          }}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Remettre prix initial
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {[250, 500, 1000, 2000].map((disc) => (
                          <button
                            key={disc}
                            type="button"
                            onClick={() => {
                              const nextP = Math.max(0, item.product.salePrice - disc);
                              updateCartItemPrice(item.product.id, nextP);
                              setCustomCartPriceInput(String(nextP));
                            }}
                            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[10px] font-mono font-bold"
                          >
                            -{disc} F
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={customCartPriceInput}
                          onChange={(e) => {
                            setCustomCartPriceInput(e.target.value);
                            const val = parseFloat(e.target.value);
                            if (Number.isFinite(val) && val >= 0) {
                              updateCartItemPrice(item.product.id, val);
                            }
                          }}
                          placeholder="Prix client..."
                          className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingCartItemId(null)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-600">Le panier est vide</p>
                <p className="text-[11px]">Touchez un article du catalogue ou utilisez l'onglet Réassort pour vendre à prix réduit.</p>
              </div>
            )}
          </div>

          {/* Pricing Totals & Global Customer Price Reduction */}
          {cart.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-slate-200 text-xs">
              {/* Button to toggle Global Ticket Price Reduction */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowGlobalDiscountBox((v) => !v);
                    setGlobalTargetTotalInput(String(cartTotal));
                  }}
                  className="text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  <BadgePercent className="w-3.5 h-3.5 text-amber-600" />
                  <span>Diminuer le total pour ce client (Remise globale)</span>
                </button>

                {totalDiscountGranted > 0 && (
                  <button
                    type="button"
                    onClick={resetCartPricesToCatalog}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                  >
                    Annuler remises
                  </button>
                )}
              </div>

              {showGlobalDiscountBox && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                    <span>Saisir le nouveau total négocié avec le client :</span>
                    <span className="font-mono text-slate-500">
                      Catalogue : {formatFCFA(cartCatalogTotal)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[500, 1000, 2000, 5000].map((disc) => (
                      <button
                        key={disc}
                        type="button"
                        onClick={() =>
                          applyNegotiatedCartTotal(Math.max(0, cartTotal - disc))
                        }
                        className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[10px] font-mono font-bold text-amber-900"
                      >
                        -{disc.toLocaleString('fr-FR')} F sur le total
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={globalTargetTotalInput}
                      onChange={(e) => setGlobalTargetTotalInput(e.target.value)}
                      placeholder="Nouveau total à payer en FCFA..."
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseFloat(globalTargetTotalInput);
                        if (Number.isFinite(parsed) && parsed >= 0) {
                          applyNegotiatedCartTotal(parsed);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              )}

              {totalDiscountGranted > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total initial catalogue :</span>
                    <span className="font-mono line-through">{formatFCFA(cartCatalogTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Remise accordée au client :</span>
                    <span className="font-mono">-{formatFCFA(totalDiscountGranted)}</span>
                  </div>
                </div>
              )}

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
              {lastReceipt.discountAmount && lastReceipt.discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Total catalogue :</span>
                    <span className="line-through">{formatFCFA(lastReceipt.originalTotalAmount || lastReceipt.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Remise client :</span>
                    <span>-{formatFCFA(lastReceipt.discountAmount)}</span>
                  </div>
                </>
              )}

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
