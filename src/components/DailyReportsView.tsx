import React, { useState, useMemo } from 'react';
import {
  Printer,
  Calendar,
  Building2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  TrendingUp,
  Receipt,
  Download,
  Filter,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { StockMovement, PaymentMethod } from '../types';

export const DailyReportsView: React.FC = () => {
  const { movements, appUsers, activeAppUser, openSwitchAccountModal } = useStock();

  // Date helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [selectedCashier, setSelectedCashier] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');

  // Modal for printable Z report
  const [printZModalOpen, setPrintZModalOpen] = useState(false);
  const [targetZStore, setTargetZStore] = useState<string>('ALL');

  // Extract distinct store names and cashier names
  const availableStores = useMemo(() => {
    const storeSet = new Set<string>();
    appUsers.forEach((u) => {
      if (u.storeName) storeSet.add(u.storeName);
    });
    movements.forEach((m) => {
      if (m.storeName) storeSet.add(m.storeName);
    });
    // Ensure default boutiques are listed
    storeSet.add('Boutique VisionTech Centrale');
    storeSet.add('Boutique Ouagadougou');
    storeSet.add('Boutique Gorom-Gorom');
    return Array.from(storeSet);
  }, [appUsers, movements]);

  const availableCashiers = useMemo(() => {
    const cashierSet = new Set<string>();
    appUsers.forEach((u) => {
      if (u.role === 'CASHIER') cashierSet.add(u.fullName || u.username);
    });
    movements.forEach((m) => {
      if (m.operator) cashierSet.add(m.operator);
    });
    return Array.from(cashierSet);
  }, [appUsers, movements]);

  // Extract and aggregate sales movements
  // A movement is a sale if type === 'OUT' and has ticketNumber or reason starts with 'Vente'
  const salesMovements = useMemo(() => {
    return movements.filter((m) => {
      const isSale = m.type === 'OUT' && (m.ticketNumber || m.reason.toLowerCase().includes('vente'));
      if (!isSale) return false;

      // Filter by Date
      if (selectedDate !== 'ALL') {
        const mDate = m.createdAt.split('T')[0];
        if (mDate !== selectedDate) return false;
      }

      // Filter by Store
      if (selectedStore !== 'ALL') {
        const store = m.storeName || 'Boutique VisionTech Centrale';
        if (store !== selectedStore) return false;
      }

      // Filter by Cashier
      if (selectedCashier !== 'ALL') {
        if (m.operator !== selectedCashier) return false;
      }

      // Filter by Payment Method
      if (selectedPaymentMethod !== 'ALL') {
        if (m.paymentMethod !== selectedPaymentMethod) return false;
      }

      return true;
    });
  }, [movements, selectedDate, selectedStore, selectedCashier, selectedPaymentMethod]);

  // Group individual sales movements into distinct tickets
  const dailyTickets = useMemo(() => {
    const map = new Map<string, {
      ticketNumber: string;
      timestamp: string;
      storeName: string;
      cashier: string;
      paymentMethod: PaymentMethod;
      totalAmount: number;
      items: { name: string; quantity: number; amount: number }[];
    }>();

    salesMovements.forEach((m) => {
      const ticketId = m.ticketNumber || m.id;
      const amount = m.saleAmount || (Math.abs(m.quantityDelta) * 50); // fallback reasonable estimate
      const store = m.storeName || 'Boutique VisionTech Centrale';
      const cashier = m.operator || 'Caissier';
      const payment: PaymentMethod = m.paymentMethod || 'CASH';

      if (!map.has(ticketId)) {
        map.set(ticketId, {
          ticketNumber: m.ticketNumber || `TCK-${ticketId.slice(-6)}`,
          timestamp: m.createdAt,
          storeName: store,
          cashier,
          paymentMethod: payment,
          totalAmount: 0,
          items: [],
        });
      }

      const ticket = map.get(ticketId)!;
      ticket.totalAmount += amount;
      ticket.items.push({
        name: m.productName,
        quantity: Math.abs(m.quantityDelta),
        amount,
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [salesMovements]);

  // Totals & KPIs
  const totalSalesAmount = useMemo(() => {
    return dailyTickets.reduce((sum, t) => sum + t.totalAmount, 0);
  }, [dailyTickets]);

  const totalTicketsCount = dailyTickets.length;

  const totalItemsSold = useMemo(() => {
    return salesMovements.reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);
  }, [salesMovements]);

  const cashAmount = useMemo(() => {
    return dailyTickets
      .filter((t) => t.paymentMethod === 'CASH')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [dailyTickets]);

  const cardAmount = useMemo(() => {
    return dailyTickets
      .filter((t) => t.paymentMethod === 'CARD')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [dailyTickets]);

  const transferAmount = useMemo(() => {
    return dailyTickets
      .filter((t) => t.paymentMethod === 'TRANSFER')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [dailyTickets]);

  // Store Breakdown Table
  const storeBreakdowns = useMemo(() => {
    const storeMap = new Map<string, {
      storeName: string;
      ticketsCount: number;
      totalAmount: number;
      cashAmount: number;
      cardAmount: number;
      transferAmount: number;
      cashiers: Set<string>;
    }>();

    // Initialize all known stores so they appear even if 0 sales today
    availableStores.forEach((st) => {
      storeMap.set(st, {
        storeName: st,
        ticketsCount: 0,
        totalAmount: 0,
        cashAmount: 0,
        cardAmount: 0,
        transferAmount: 0,
        cashiers: new Set<string>(),
      });
    });

    dailyTickets.forEach((t) => {
      if (!storeMap.has(t.storeName)) {
        storeMap.set(t.storeName, {
          storeName: t.storeName,
          ticketsCount: 0,
          totalAmount: 0,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          cashiers: new Set<string>(),
        });
      }
      const item = storeMap.get(t.storeName)!;
      item.ticketsCount += 1;
      item.totalAmount += t.totalAmount;
      if (t.paymentMethod === 'CASH') item.cashAmount += t.totalAmount;
      if (t.paymentMethod === 'CARD') item.cardAmount += t.totalAmount;
      if (t.paymentMethod === 'TRANSFER') item.transferAmount += t.totalAmount;
      item.cashiers.add(t.cashier);
    });

    return Array.from(storeMap.values()).filter((item) => {
      if (selectedStore === 'ALL') return true;
      return item.storeName === selectedStore;
    });
  }, [dailyTickets, availableStores, selectedStore]);

  // Format currency
  const formatMoney = (val: number) => {
    return `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  };

  const handlePrintZ = (storeName: string = 'ALL') => {
    setTargetZStore(storeName);
    setPrintZModalOpen(true);
  };

  const executePrint = () => {
    window.print();
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Date', 'Ticket', 'Boutique', 'Caissier', 'Mode de Paiement', 'Total (€)', 'Articles'];
    const rows = dailyTickets.map((t) => [
      new Date(t.timestamp).toLocaleString('fr-FR'),
      t.ticketNumber,
      `"${t.storeName}"`,
      `"${t.cashier}"`,
      t.paymentMethod,
      t.totalAmount.toFixed(2),
      `"${t.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rapport_Ventes_${selectedDate}_${selectedStore}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Rapport Journalier & Caisses (Z de Caisse)
              </h1>
              <p className="text-xs text-slate-500">
                Suivi multi-boutiques en temps réel : visualisez les encaissements de chaque magasin à distance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openSwitchAccountModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
            title="Changer de boutique ou de compte caissier"
          >
            <Building2 className="w-4 h-4" />
            <span>Changer de compte</span>
          </button>

          <button
            onClick={() => handlePrintZ('ALL')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer Z de Caisse</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filtres de Synthèse & Consultation</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedDate === todayStr
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedDate === yesterdayStr
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hier
            </button>
            <button
              onClick={() => setSelectedDate('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedDate === 'ALL'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Historique complet
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Date Picker */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Date du rapport
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Store Selector */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Boutique / Point de Vente
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
            >
              <option value="ALL">Toutes les Boutiques (Consolidation)</option>
              {availableStores.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Cashier Selector */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Caissier / Opérateur
            </label>
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
            >
              <option value="ALL">Tous les Caissiers</option>
              {availableCashiers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Mode de Règlement
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-medium"
            >
              <option value="ALL">Tous les Modes de Règlement</option>
              <option value="CASH">Espèces uniquement</option>
              <option value="CARD">Carte Bancaire uniquement</option>
              <option value="TRANSFER">Virement / Mobile Money</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Sales */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-90 text-xs">
            <span className="font-medium">Chiffre d'Affaires</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black tracking-tight block">
              {formatMoney(totalSalesAmount)}
            </span>
            <span className="text-[11px] opacity-80 block">
              {totalTicketsCount} ticket{totalTicketsCount > 1 ? 's' : ''} émis
            </span>
          </div>
          <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md self-start font-mono">
            {totalItemsSold} articles vendus
          </div>
        </div>

        {/* Cash */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Espèces (Caisse)</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <span className="text-xl font-black text-slate-900 block">
              {formatMoney(cashAmount)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Total en liquide
            </span>
          </div>
          <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold self-start">
            {totalSalesAmount > 0 ? `${((cashAmount / totalSalesAmount) * 100).toFixed(0)}% du total` : '0%'}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Carte Bancaire</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-2">
            <span className="text-xl font-black text-slate-900 block">
              {formatMoney(cardAmount)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Paiements TPE
            </span>
          </div>
          <div className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold self-start">
            {totalSalesAmount > 0 ? `${((cardAmount / totalSalesAmount) * 100).toFixed(0)}% du total` : '0%'}
          </div>
        </div>

        {/* Transfer / Mobile Money */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Mobile Money / Virement</span>
            <Smartphone className="w-4 h-4 text-purple-600" />
          </div>
          <div className="my-2">
            <span className="text-xl font-black text-slate-900 block">
              {formatMoney(transferAmount)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Orange Money / Wave / Virement
            </span>
          </div>
          <div className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold self-start">
            {totalSalesAmount > 0 ? `${((transferAmount / totalSalesAmount) * 100).toFixed(0)}% du total` : '0%'}
          </div>
        </div>

        {/* Tickets Volume */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Panier Moyen</span>
            <ShoppingBag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="my-2">
            <span className="text-xl font-black text-slate-900 block">
              {formatMoney(totalTicketsCount > 0 ? totalSalesAmount / totalTicketsCount : 0)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Par passage en caisse
            </span>
          </div>
          <div className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-semibold self-start">
            {totalTicketsCount} transactions
          </div>
        </div>
      </div>

      {/* Multi-Store Comparison & Consolidation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Consolidation des Ventes par Boutique & Caisse</span>
            </h2>
            <p className="text-xs text-slate-500">
              Récapitulatif des recettes pour chaque point de vente sur la période sélectionnée.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
            {storeBreakdowns.length} boutique{storeBreakdowns.length > 1 ? 's' : ''} suivie{storeBreakdowns.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Boutique / Magasin</th>
                <th className="py-3 px-4">Caissiers affectés</th>
                <th className="py-3 px-4 text-center">Tickets</th>
                <th className="py-3 px-4 text-right">Espèces</th>
                <th className="py-3 px-4 text-right">Carte Bancaire</th>
                <th className="py-3 px-4 text-right">Mobile Money</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">Total Ventes</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {storeBreakdowns.map((b) => (
                <tr key={b.storeName} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        🏪
                      </div>
                      <span className="truncate">{b.storeName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {b.cashiers.size > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Array.from(b.cashiers).map((c) => (
                          <span
                            key={c}
                            className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">En attente d'ouverture</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                    {b.ticketsCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-semibold">
                    {formatMoney(b.cashAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">
                    {formatMoney(b.cardAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-purple-700 font-semibold">
                    {formatMoney(b.transferAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-slate-900">
                    {formatMoney(b.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handlePrintZ(b.storeName)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-colors"
                      title="Imprimer le ticket Z de cette boutique"
                    >
                      Ticket Z 🖨️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-bold text-xs text-slate-900 border-t border-slate-200">
                <td className="py-3 px-4">TOTAL CONSOLIDÉ</td>
                <td className="py-3 px-4 text-slate-500">{availableStores.length} boutiques</td>
                <td className="py-3 px-4 text-center font-mono">{totalTicketsCount}</td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800">{formatMoney(cashAmount)}</td>
                <td className="py-3 px-4 text-right font-mono text-blue-800">{formatMoney(cardAmount)}</td>
                <td className="py-3 px-4 text-right font-mono text-purple-800">{formatMoney(transferAmount)}</td>
                <td className="py-3 px-4 text-right font-mono text-sm text-blue-900 font-black">
                  {formatMoney(totalSalesAmount)}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handlePrintZ('ALL')}
                    className="text-[11px] text-blue-700 hover:underline font-bold"
                  >
                    Z Global
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Daily Detailed Tickets Log */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Détail des Tickets de Caisse du Jour</span>
            </h2>
            <p className="text-xs text-slate-500">
              Historique chronologique des transactions enregistrées par les caisses.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
            {dailyTickets.length} ticket{dailyTickets.length > 1 ? 's' : ''}
          </span>
        </div>

        {dailyTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">Aucune vente enregistrée pour les filtres sélectionnés.</p>
            <p className="text-[11px]">Enregistrez des ventes depuis l'onglet Caisse pour générer le rapport.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dailyTickets.map((ticket) => {
              const timeStr = new Date(ticket.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={ticket.ticketNumber} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                        #{ticket.ticketNumber}
                      </span>
                      <span className="text-slate-400 font-mono">à {timeStr}</span>
                      <span className="font-semibold text-slate-800">
                        📍 {ticket.storeName}
                      </span>
                      <span className="text-slate-500">
                        (👤 {ticket.cashier})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      Articles :{' '}
                      <span className="font-medium text-slate-800">
                        {ticket.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ticket.paymentMethod === 'CASH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ticket.paymentMethod === 'CARD'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {ticket.paymentMethod === 'CASH'
                        ? 'Espèces'
                        : ticket.paymentMethod === 'CARD'
                        ? 'Carte Bancaire'
                        : 'Virement / Mobile'}
                    </span>

                    <span className="font-mono font-bold text-sm text-slate-900">
                      {formatMoney(ticket.totalAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable Z-Report Modal */}
      {printZModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-xs text-slate-800">
                Aperçu Z de Caisse - Rapport Journalier
              </span>
              <button
                onClick={() => setPrintZModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Printable Ticket Area */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white text-slate-900 font-mono text-xs">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <h3 className="font-bold text-base tracking-wider uppercase">
                  {targetZStore === 'ALL' ? 'BOUTIQUE VISIONTECH' : targetZStore.toUpperCase()}
                </h3>
                <p className="text-[11px] text-slate-500">CLÔTURE JOURNALIÈRE - RAPPORT Z</p>
                <p className="text-[10px] text-slate-400">
                  Date : {selectedDate === 'ALL' ? todayStr : selectedDate}
                </p>
                <p className="text-[10px] text-slate-400">
                  Généré le : {new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>

              {/* Scope details */}
              <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Magasin :</span>
                  <span className="font-bold">{targetZStore === 'ALL' ? 'Toutes Boutiques' : targetZStore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Opérateur :</span>
                  <span>{selectedCashier === 'ALL' ? activeAppUser?.fullName || 'Superviseur' : selectedCashier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nombre de ventes :</span>
                  <span className="font-bold">{totalTicketsCount}</span>
                </div>
              </div>

              {/* Payment Split */}
              <div className="space-y-1.5 py-2 border-b border-dashed border-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Répartition par Règlement
                </span>
                <div className="flex justify-between">
                  <span>ESPÈCES :</span>
                  <span className="font-bold">{formatMoney(cashAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CARTE BANCAIRE :</span>
                  <span className="font-bold">{formatMoney(cardAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MOBILE MONEY / VIREMENT :</span>
                  <span className="font-bold">{formatMoney(transferAmount)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="py-2 border-b-2 border-slate-800 space-y-1 text-sm font-bold flex justify-between">
                <span>TOTAL CHIFFRE D'AFFAIRES :</span>
                <span>{formatMoney(totalSalesAmount)}</span>
              </div>

              {/* Signatures */}
              <div className="pt-3 text-[10px] text-slate-400 text-center space-y-2">
                <p>Certifié conforme - Clôture officielle</p>
                <div className="h-10 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300">
                  Signature du Responsable
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setPrintZModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Fermer
              </button>
              <button
                onClick={executePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer maintenant</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
