import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Building2,
  Calendar,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
  Printer,
  Boxes,
  FileSpreadsheet,
  Receipt,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Expense, ExpenseCategory, PurchaseBatch, PaymentMethod, Product } from '../types';

export const AccountingView: React.FC = () => {
  const {
    products,
    movements,
    expenses,
    purchases,
    addExpense,
    deleteExpense,
    recordPurchaseBatch,
    deletePurchaseBatch,
    activeAppUser,
  } = useStock();

  // Period filter states: 'today' | '7days' | 'month' | 'year' | 'all'
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'year' | 'all'>('month');
  const [subTab, setSubTab] = useState<'overview' | 'cashflow' | 'purchases' | 'expenses' | 'stock_valuation'>('overview');

  // New Expense form state
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('LOYER');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expPaymentMethod, setExpPaymentMethod] = useState<PaymentMethod>('CASH');
  const [expNotes, setExpNotes] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseSuccess, setExpenseSuccess] = useState<string | null>(null);

  // New Purchase form state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [purchaseProductName, setPurchaseProductName] = useState('');
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseTotalGoods, setPurchaseTotalGoods] = useState<number>(0);
  const [purchaseShipping, setPurchaseShipping] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [updateStockCheck, setUpdateStockCheck] = useState(true);
  const [updateCostCheck, setUpdateCostCheck] = useState(true);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [isRecordingPurchase, setIsRecordingPurchase] = useState(false);

  // Category filter for expenses list
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Filter dates calculation
  const periodRange = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (period === 'today') {
      return { start: today, end: today };
    }
    if (period === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString().split('T')[0], end: today };
    }
    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { start: startOfMonth, end: today };
    }
    if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { start: startOfYear, end: today };
    }
    return { start: '2020-01-01', end: '2099-12-31' };
  }, [period]);

  // Filtered movements (Sales / Encaissements)
  const filteredSalesMovements = useMemo(() => {
    return movements.filter((m) => {
      if (m.type !== 'OUT') return false;
      const movDate = (m.createdAt || '').split('T')[0];
      return movDate >= periodRange.start && movDate <= periodRange.end;
    });
  }, [movements, periodRange]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDateVal = e.date || (e.createdAt || '').split('T')[0];
      const matchDate = expDateVal >= periodRange.start && expDateVal <= periodRange.end;
      const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
      return matchDate && matchCat;
    });
  }, [expenses, periodRange, categoryFilter]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const pDate = p.date || (p.createdAt || '').split('T')[0];
      return pDate >= periodRange.start && pDate <= periodRange.end;
    });
  }, [purchases, periodRange]);

  // --- Financial Calculations ---
  // 1. Chiffre d'Affaires réalisé (Ventes)
  const totalRevenue = useMemo(() => {
    return filteredSalesMovements.reduce((acc, m) => {
      return acc + (Number(m.saleAmount) || 0);
    }, 0);
  }, [filteredSalesMovements]);

  // 2. Coût d'achat estimé des marchandises vendues (CAMV)
  const costOfGoodsSold = useMemo(() => {
    const prodMap = new Map<string, number>();
    products.forEach((p) => prodMap.set(p.id, p.costPrice || 0));

    return filteredSalesMovements.reduce((acc, m) => {
      const unitCost = prodMap.get(m.productId) || 0;
      const qtySold = Math.abs(m.quantityDelta);
      return acc + unitCost * qtySold;
    }, 0);
  }, [filteredSalesMovements, products]);

  // 3. Marge Brute Commerciale
  const grossProfit = totalRevenue - costOfGoodsSold;

  // 4. Dépenses d'exploitation (hors achat de stock)
  const operatingExpenses = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.category !== 'ACHAT_STOCK')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // 5. Total des achats de stock décaissés sur la période
  const totalStockPurchasesPaid = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (Number(p.totalCostPaid) || 0), 0);
  }, [filteredPurchases]);

  // 6. Bénéfice Net Réel d'Exploitation
  const netProfit = grossProfit - operatingExpenses;

  // 7. Solde des flux de trésorerie disponible (Cash Flow)
  // Entrées (Ventes encaissées) - Sorties (Achats marchandises + Dépenses charges)
  const netCashFlow = totalRevenue - (totalStockPurchasesPaid + operatingExpenses);

  // 8. Valorisation Comptable du Stock Actuel (Restant)
  const stockValuation = useMemo(() => {
    let totalItems = 0;
    let totalCostValue = 0;
    let totalSaleValue = 0;

    products.forEach((p) => {
      const qty = Math.max(0, p.quantity || 0);
      const cost = Math.max(0, p.costPrice || 0);
      const sale = Math.max(0, p.salePrice || 0);

      totalItems += qty;
      totalCostValue += qty * cost;
      totalSaleValue += qty * sale;
    });

    const potentialGrossMargin = totalSaleValue - totalCostValue;
    const marginRatio = totalSaleValue > 0 ? (potentialGrossMargin / totalSaleValue) * 100 : 0;

    return {
      totalItems,
      totalCostValue,
      totalSaleValue,
      potentialGrossMargin,
      marginRatio,
    };
  }, [products]);

  // Category breakdown for expenses
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses
      .filter((e) => e.category !== 'ACHAT_STOCK')
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
      });
    return map;
  }, [filteredExpenses]);

  // Handle Product Selection in Purchase Form
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) {
      setPurchaseProductName('');
      return;
    }
    const found = products.find((p) => p.id === prodId);
    if (found) {
      setPurchaseProductName(found.name);
      if (found.supplier) setPurchaseSupplier(found.supplier);
      if (found.costPrice > 0 && purchaseTotalGoods === 0) {
        setPurchaseTotalGoods(found.costPrice * purchaseQty);
      }
    }
  };

  // Purchase Form Live Unit Cost Calculations
  const safeQty = Math.max(1, purchaseQty || 1);
  const unitGoodsPrice = Math.round((purchaseTotalGoods || 0) / safeQty);
  const unitShippingPrice = Math.round((purchaseShipping || 0) / safeQty);
  const trueUnitCost = Math.round(((purchaseTotalGoods || 0) + (purchaseShipping || 0)) / safeQty);
  const totalPurchasePaid = (purchaseTotalGoods || 0) + (purchaseShipping || 0);

  // Handle Submit Purchase Batch
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseProductName.trim()) {
      alert('Veuillez renseigner le nom ou choisir le produit payé.');
      return;
    }
    if (purchaseQty <= 0 || purchaseTotalGoods < 0 || purchaseShipping < 0) {
      alert('Veuillez renseigner des montants et quantités valides.');
      return;
    }

    setIsRecordingPurchase(true);
    try {
      const selectedProduct = products.find((p) => p.id === selectedProductId);

      const res = await recordPurchaseBatch(
        {
          date: purchaseDate,
          productId: selectedProductId || undefined,
          productSku: selectedProduct?.sku || undefined,
          productName: purchaseProductName.trim(),
          quantityBought: purchaseQty,
          purchasePriceTotal: purchaseTotalGoods,
          unitPurchasePrice: unitGoodsPrice,
          shippingCost: purchaseShipping,
          unitShippingCost: unitShippingPrice,
          unitCostPrice: trueUnitCost,
          totalCostPaid: totalPurchasePaid,
          supplierName: purchaseSupplier.trim() || undefined,
          notes: purchaseNotes.trim() || undefined,
          recordedBy: activeAppUser?.fullName || activeAppUser?.username || 'Gérant',
        },
        {
          updateProductStock: updateStockCheck && !!selectedProductId,
          updateProductCostPrice: updateCostCheck && !!selectedProductId,
          createExpense: true,
        }
      );

      setPurchaseSuccess(res.message);
      // Reset form
      setPurchaseTotalGoods(0);
      setPurchaseShipping(0);
      setPurchaseNotes('');
      setTimeout(() => setPurchaseSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement de l'achat.");
    } finally {
      setIsRecordingPurchase(false);
    }
  };

  // Handle Submit Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || expAmount <= 0) {
      alert('Veuillez préciser le motif et un montant valide supérieur à 0.');
      return;
    }

    setIsAddingExpense(true);
    try {
      await addExpense({
        date: expDate,
        category: expCategory,
        description: expDesc.trim(),
        amount: expAmount,
        paymentMethod: expPaymentMethod,
        recordedBy: activeAppUser?.fullName || activeAppUser?.username || 'Gérant',
        storeName: 'Boutique Moussa Vision',
        notes: expNotes.trim() || undefined,
      });

      setExpenseSuccess(`Charge de ${expAmount.toLocaleString('fr-FR')} FCFA enregistrée !`);
      setExpDesc('');
      setExpAmount(0);
      setExpNotes('');
      setTimeout(() => setExpenseSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement de la dépense.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'TRANSPORT':
        return 'Transport & Déplacements';
      case 'LOYER':
        return 'Loyer Commercial';
      case 'FACTURES':
        return 'Factures (Électricité, Eau, Internet)';
      case 'SALAIRES':
        return 'Salaires & Rémunérations';
      case 'EMBALLAGE':
        return 'Emballages & Sachets';
      case 'REPAS_DEPLACEMENT':
        return 'Restauration & Missions';
      case 'TAXES':
        return 'Taxes & Impôts';
      case 'ACHAT_STOCK':
        return 'Achat de Marchandises';
      default:
        return 'Autres Dépenses';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Comptabilité & Trésorerie
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Module Financier
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Suivi des flux de trésorerie, gestion des coûts d'achats avec frais de transport, charges et valorisation du stock.
          </p>
        </div>

        {/* Global Controls & Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                period === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                period === '7days' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                period === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                period === 'year' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Année
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                period === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimer Bilan</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Trésorerie Nette Disponible */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Trésorerie Nette (Cash Flow)</span>
            <div className={`p-2 rounded-lg ${netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {netCashFlow >= 0 ? '+' : ''}{netCashFlow.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">FCFA</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span>Encaissements - Décaissements</span>
          </div>
          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
            netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {netCashFlow >= 0 ? 'Solde Excédentaire' : 'Déficit de Trésorerie'}
          </div>
        </div>

        {/* Card 2: Chiffre d'Affaires Encaissé */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Chiffre d'Affaires (Ventes)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {totalRevenue.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">FCFA</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Marge Brute :</span>
            <span className="font-semibold text-slate-700 font-mono">
              {grossProfit.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
            {filteredSalesMovements.length} ticket(s) de vente
          </div>
        </div>

        {/* Card 3: Total Dépenses d'Exploitation & Achats */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Dépenses & Achats de Stock</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-900 tracking-tight">
              {(totalStockPurchasesPaid + operatingExpenses).toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">FCFA</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Achats Stock: {totalStockPurchasesPaid.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>Charges Expl.: {operatingExpenses.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Card 4: Bénéfice Net Réel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Bénéfice Net Réel</span>
            <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {netProfit.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">FCFA</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Marge brute - Charges d'exploitation
          </div>
          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
            netProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {netProfit >= 0 ? 'Résultat Bénéficiaire' : 'Résultat Déficitaire'}
          </div>
        </div>
      </div>

      {/* Secondary Stock Valuation Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl">
            <Boxes className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Valorisation Comptable du Stock Restant</h3>
            <p className="text-xs text-slate-300">
              {stockValuation.totalItems} articles physiques en stock répartis sur {products.length} références
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-700/60 pt-3 md:border-t-0 md:pt-0">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Valeur Coût d'Achat
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-white">
              {stockValuation.totalCostValue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Valeur Marchande (Vente)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">
              {stockValuation.totalSaleValue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Marge Brute Latente
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-amber-400">
              +{stockValuation.potentialGrossMargin.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
            subTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Compte de Résultat & Bilan</span>
        </button>

        <button
          onClick={() => setSubTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
            subTab === 'purchases'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Achats & Calculateur Transport</span>
          {purchases.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {purchases.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
            subTab === 'expenses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Charges & Dépenses ({expenses.filter((e) => e.category !== 'ACHAT_STOCK').length})</span>
        </button>

        <button
          onClick={() => setSubTab('cashflow')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
            subTab === 'cashflow'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          <span>Journal des Flux de Trésorerie</span>
        </button>

        <button
          onClick={() => setSubTab('stock_valuation')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
            subTab === 'stock_valuation'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Valorisation par Article</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW / COMPTE DE RÉSULTAT */}
      {subTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compte de Résultat Simplifié */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Compte de Résultat d'Exploitation
                </h3>
                <p className="text-xs text-slate-500">
                  Période du {periodRange.start} au {periodRange.end}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 rounded text-slate-700">
                Norme SYSCOHADA / Pratique
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {/* Produits / Ventes */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/50">
                <div className="font-semibold text-blue-900">
                  (+) Chiffre d'Affaires Brut (Ventes réalisées)
                </div>
                <div className="font-mono font-bold text-sm text-blue-700">
                  {totalRevenue.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              {/* Coût des Marchandises Vendues */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <div className="text-slate-700">
                  (-) Coût d'Achat des Marchandises Vendues (CAMV)
                  <span className="block text-[10px] text-slate-400">
                    Stock vendu valorisé à son coût de revient
                  </span>
                </div>
                <div className="font-mono font-bold text-rose-600">
                  -{costOfGoodsSold.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              {/* Marge Brute */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 font-bold border border-slate-200">
                <div className="text-slate-900">(=) MARGE BRUTE COMMERCIALE</div>
                <div className="font-mono text-sm text-slate-900">
                  {grossProfit.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              {/* Charges d'exploitation */}
              <div className="pt-2">
                <span className="font-semibold text-slate-700 block mb-2">
                  Détail des Charges d'Exploitation Décaissées :
                </span>
                <div className="space-y-1.5 pl-3 border-l-2 border-slate-200">
                  {Object.keys(expensesByCategory).length === 0 ? (
                    <div className="text-slate-400 italic">Aucune charge d'exploitation enregistrée sur la période.</div>
                  ) : (
                    Object.entries(expensesByCategory).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between text-slate-600">
                        <span>• {getCategoryLabel(cat as ExpenseCategory)}</span>
                        <span className="font-mono text-rose-600 font-semibold">
                          -{amt.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    ))
                  )}
                  <div className="flex items-center justify-between font-semibold text-slate-800 pt-1 border-t border-slate-100">
                    <span>Total des Charges d'Exploitation :</span>
                    <span className="font-mono text-rose-700 font-bold">
                      -{operatingExpenses.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Résultat Net */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                netProfit >= 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-rose-50/80 border-rose-300'
              }`}>
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-700">
                    (=) BÉNÉFICE NET RÉEL D'EXPLOITATION
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Marge brute dégagée après déduction de toutes les charges
                  </div>
                </div>
                <div className={`text-lg sm:text-xl font-bold font-mono ${
                  netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {netProfit.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>
          </div>

          {/* Ventilation des Dépenses & Aide Pédagogique */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Répartition des Charges
              </h3>
              {Object.keys(expensesByCategory).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Aucune charge sur cette période.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(expensesByCategory).map(([cat, amt]) => {
                    const pct = operatingExpenses > 0 ? (amt / operatingExpenses) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">{getCategoryLabel(cat as ExpenseCategory)}</span>
                          <span className="font-mono text-slate-900 font-semibold">{amt.toLocaleString('fr-FR')} FCFA ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-700" />
                <span>Comment est calculé le Coût de Revient ?</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Le coût de revient unitaire est calculé selon la formule exacte :
                <br />
                <strong className="font-mono font-bold text-slate-900">
                  (Prix d'achat total des marchandises + Frais de transport) ÷ Quantité achetée
                </strong>
                <br />
                Cela permet d'intégrer les coûts d'acheminement directement dans la valeur marchande pour protéger vos marges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASES & TRANSPORT CALCULATOR */}
      {subTab === 'purchases' && (
        <div className="space-y-6">
          {/* Purchase Registration Form with Interactive Transport Calculator */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Enregistrer un Achat de Marchandises & Calculer le Coût avec Transport
                  </h3>
                  <p className="text-xs text-slate-500">
                    Renseignez le montant payé et le transport vers la destination : StockFlow calcule automatiquement le prix de revient par pièce.
                  </p>
                </div>
              </div>
            </div>

            {purchaseSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{purchaseSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Select from catalog or type name */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Lier à un article du catalogue
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="">-- Article libre (Hors catalogue) --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} (Stock actuel: {p.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Désignation du produit payé *
                  </label>
                  <input
                    type="text"
                    required
                    value={purchaseProductName}
                    onChange={(e) => setPurchaseProductName(e.target.value)}
                    placeholder="Ex: Montre Connectée Pro V3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Fournisseur / Lieu d'achat
                  </label>
                  <input
                    type="text"
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    placeholder="Ex: Marché Central / Dubaï / Chine"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Quantity, Total Purchase, and Shipping */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Quantité de produits payés *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Prix total d'achat marchandises (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={purchaseTotalGoods}
                    onChange={(e) => setPurchaseTotalGoods(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Ex: 100000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Frais de Transport jusqu'à destination (FCFA)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={purchaseShipping}
                    onChange={(e) => setPurchaseShipping(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Ex: 15000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Date du paiement / achat
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Automatic Educational Explanation Panel */}
              <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-200 space-y-2">
                <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Explication Automatique du Coût de Revient Unitaire :</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-[11px] text-slate-500 block">1. Prix d'achat brut par pièce :</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {unitGoodsPrice.toLocaleString('fr-FR')} FCFA / pc
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ({purchaseTotalGoods.toLocaleString('fr-FR')} ÷ {purchaseQty})
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-[11px] text-slate-500 block">2. Part de transport par pièce :</span>
                    <span className="font-mono font-bold text-amber-700 text-sm">
                      +{unitShippingPrice.toLocaleString('fr-FR')} FCFA / pc
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ({purchaseShipping.toLocaleString('fr-FR')} ÷ {purchaseQty})
                    </span>
                  </div>

                  <div className="bg-blue-600 text-white p-2.5 rounded-lg shadow-xs">
                    <span className="text-[11px] text-blue-100 block font-medium">🎯 Prix de Revient Unitaire Réel :</span>
                    <span className="font-mono font-bold text-base text-white">
                      {trueUnitCost.toLocaleString('fr-FR')} FCFA / pc
                    </span>
                    <span className="text-[10px] text-blue-200 block mt-0.5">
                      Total décaissé : {totalPurchasePaid.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Auto update stock & cost options */}
              {selectedProductId && (
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={updateStockCheck}
                      onChange={(e) => setUpdateStockCheck(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ajouter automatiquement +{purchaseQty} unités au stock du catalogue</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={updateCostCheck}
                      onChange={(e) => setUpdateCostCheck(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Mettre à jour le prix d'achat de la fiche article à {trueUnitCost} FCFA</span>
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isRecordingPurchase}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                >
                  {isRecordingPurchase ? 'Enregistrement en cours...' : 'Valider & Enregistrer ce Lot d’Achat'}
                </button>
              </div>
            </form>
          </div>

          {/* Purchases History Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">
                Historique des Lots d'Achats & Frais d'Approche ({filteredPurchases.length})
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Article Acheté</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Quantité</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Achat Brut</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Transport</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Coût Unitaire Réel</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Total Décaissé</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400 font-sans italic">
                        Aucun lot d'achat enregistré pour cette période.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 text-slate-600">{p.date}</td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">
                          {p.productName}
                          {p.supplierName && (
                            <span className="block text-[10px] text-slate-400">Fourn: {p.supplierName}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">{p.quantityBought} pcs</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {p.purchasePriceTotal.toLocaleString('fr-FR')} FCFA
                          <span className="block text-[10px] text-slate-400">({p.unitPurchasePrice} FCFA/u)</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-700 font-semibold">
                          +{p.shippingCost.toLocaleString('fr-FR')} FCFA
                          <span className="block text-[10px] text-slate-400">(+{p.unitShippingCost} FCFA/u)</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                            {p.unitCostPrice.toLocaleString('fr-FR')} FCFA / pc
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {p.totalCostPaid.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => {
                              if (confirm('Voulez-vous supprimer cet enregistrement d’achat ?')) {
                                deletePurchaseBatch(p.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES & CHARGES */}
      {subTab === 'expenses' && (
        <div className="space-y-6">
          {/* New Expense Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Enregistrer une Nouvelle Charge ou Dépense de Fonctionnement
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Loyer, factures (électricité, eau, internet), salaires, transport divers, emballage ou repas.
            </p>

            {expenseSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{expenseSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catégorie de Dépense *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="LOYER">Loyer Commercial</option>
                    <option value="FACTURES">Factures (Électricité, Eau, Wifi)</option>
                    <option value="SALAIRES">Salaires & Primes</option>
                    <option value="TRANSPORT">Transport & Déplacements</option>
                    <option value="EMBALLAGE">Emballages & Sachets</option>
                    <option value="REPAS_DEPLACEMENT">Restauration & Pause</option>
                    <option value="TAXES">Taxes & Mairie</option>
                    <option value="AUTRE">Autres Dépenses</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Motif / Description *</label>
                  <input
                    type="text"
                    required
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="Ex: Facture Sonabel / Rechargement électricité"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Montant décaissé (FCFA) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Ex: 25000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Enregistré au nom de : <strong className="text-slate-700">{activeAppUser?.fullName || 'Gérant'}</strong>
                </span>

                <button
                  type="submit"
                  disabled={isAddingExpense}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isAddingExpense ? 'Enregistrement...' : '+ Ajouter la dépense'}
                </button>
              </div>
            </form>
          </div>

          {/* Expenses Filter & Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-xs font-bold text-slate-800">
                Liste des Dépenses Décaissées ({filteredExpenses.filter((e) => e.category !== 'ACHAT_STOCK').length})
              </h4>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filtrer :</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-700"
                >
                  <option value="ALL">Toutes les catégories</option>
                  <option value="LOYER">Loyer</option>
                  <option value="FACTURES">Factures</option>
                  <option value="SALAIRES">Salaires</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="EMBALLAGE">Emballages</option>
                  <option value="REPAS_DEPLACEMENT">Repas & Missions</option>
                  <option value="TAXES">Taxes</option>
                  <option value="AUTRE">Autres</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Catégorie</th>
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                    <th className="px-4 py-2.5 font-semibold">Saisie par</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Montant</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.filter((e) => e.category !== 'ACHAT_STOCK').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                        Aucune dépense enregistrée pour ce filtre.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses
                      .filter((e) => e.category !== 'ACHAT_STOCK')
                      .map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-slate-600">{e.date}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                              {getCategoryLabel(e.category)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{e.description}</td>
                          <td className="px-4 py-2.5 text-slate-500">{e.recordedBy || 'Gérant'}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600">
                            -{e.amount.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => {
                                if (confirm('Supprimer cette dépense ?')) deleteExpense(e.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CASH FLOW JOURNAL */}
      {subTab === 'cashflow' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">
              Journal des Flux de Trésorerie (Entrées & Sorties d'Argent)
            </h4>
            <span className="text-xs font-mono font-bold text-slate-600">
              Solde Période : {netCashFlow >= 0 ? '+' : ''}{netCashFlow.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Nature du Flux</th>
                  <th className="px-4 py-2.5 font-semibold">Libellé / Détails</th>
                  <th className="px-4 py-2.5 font-semibold">Moyen</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Entrée (+)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Sortie (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {/* 1. Ventes (Entrées) */}
                {filteredSalesMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600">{(m.createdAt || '').split('T')[0]}</td>
                    <td className="px-4 py-2.5 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Vente Boutique
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-sans text-slate-900 font-medium">
                      Ticket {m.ticketNumber || m.id.slice(-6)} - {m.productName} (x{Math.abs(m.quantityDelta)})
                    </td>
                    <td className="px-4 py-2.5 font-sans text-slate-500">{m.paymentMethod || 'CASH'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                      +{(Number(m.saleAmount) || 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">-</td>
                  </tr>
                ))}

                {/* 2. Dépenses & Achats (Sorties) */}
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600">{e.date}</td>
                    <td className="px-4 py-2.5 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.category === 'ACHAT_STOCK'
                          ? 'bg-blue-100 text-blue-800'
                          : e.category === 'TRANSPORT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {getCategoryLabel(e.category)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-sans text-slate-900 font-medium">
                      {e.description}
                    </td>
                    <td className="px-4 py-2.5 font-sans text-slate-500">{e.paymentMethod || 'CASH'}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">-</td>
                    <td className="px-4 py-2.5 text-right font-bold text-rose-600">
                      -{e.amount.toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: STOCK VALUATION (ARTICLE PAR ARTICLE) */}
      {subTab === 'stock_valuation' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Inventaire Valorisé Article par Article (Stock Restant)
              </h4>
              <p className="text-[11px] text-slate-500">
                Comparaison entre la valeur d'achat (coût de revient) et la valeur marchande de vente.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Code SKU</th>
                  <th className="px-4 py-2.5 font-semibold">Désignation</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Stock Dispo</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Coût Unitaire (Achat)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Valeur Stock (Coût)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Prix Vente Unitaire</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Valeur Stock (Vente)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Marge Latente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-400 font-sans italic">
                      Aucun produit dans le catalogue.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const costVal = p.quantity * p.costPrice;
                    const saleVal = p.quantity * p.salePrice;
                    const marginVal = saleVal - costVal;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{p.sku}</td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {p.quantity} pcs
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">
                          {p.costPrice.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          {costVal.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-700 font-semibold">
                          {p.salePrice.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                          {saleVal.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-amber-700">
                          +{marginVal.toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100/80 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-sans">TOTAL GÉNÉRAL VALORISÉ :</td>
                  <td className="px-4 py-3 text-right">{stockValuation.totalItems} pcs</td>
                  <td className="px-4 py-3 text-right">-</td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {stockValuation.totalCostValue.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-4 py-3 text-right">-</td>
                  <td className="px-4 py-3 text-right text-emerald-800">
                    {stockValuation.totalSaleValue.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-4 py-3 text-right text-amber-800">
                    +{stockValuation.potentialGrossMargin.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
