import React, { useState, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  RotateCcw,
  Search,
  Download,
  Plus,
  ArrowLeftRight,
  Trash2,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { MovementType } from '../types';

export const MovementsView: React.FC = () => {
  const { products, movements, openMovementModal, activeAppUser, clearAllMovements, openConfirmModal } = useStock();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | 'all'>('all');

  const isCashier = activeAppUser?.role === 'CASHIER';

  // Calcul du Bilan global des Entrées, Sorties, Retours, Dotations et Stock Actuel
  const bilan = useMemo(() => {
    const productMap = new Map<string, (typeof products)[number]>(products.map((p) => [p.id, p]));

    let inQty = 0;
    let inCostValue = 0;
    let returnQty = 0;
    let outQty = 0;
    let outSaleValue = 0;
    let outCostValue = 0;
    let transferQty = 0;
    let adjustmentNet = 0;

    movements.forEach((m) => {
      const prod = productMap.get(m.productId);
      const unitCost = Number(m.unitCostAtSale ?? prod?.costPrice ?? 0);
      const unitSale = Number(prod?.salePrice ?? 0);
      const absDelta = Math.abs(Number(m.quantityDelta) || 0);

      if (m.type === 'IN') {
        inQty += absDelta;
        inCostValue += absDelta * unitCost;
      } else if (m.type === 'RETURN' && Number(m.quantityDelta) > 0) {
        returnQty += absDelta;
        inCostValue += absDelta * unitCost;
      } else if (m.type === 'OUT') {
        outQty += absDelta;
        const saleAmt = m.saleAmount !== undefined ? Number(m.saleAmount) : absDelta * unitSale;
        const costAmt = absDelta * unitCost;
        outSaleValue += saleAmt;
        outCostValue += costAmt;
      } else if (m.type === 'TRANSFER') {
        transferQty += absDelta;
      } else if (m.type === 'ADJUSTMENT') {
        adjustmentNet += Number(m.quantityDelta) || 0;
      }
    });

    const currentStockUnits = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    const currentStockCost = products.reduce(
      (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.costPrice) || 0),
      0
    );
    const currentStockSale = products.reduce(
      (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.salePrice) || 0),
      0
    );

    const totalEntriesQty = inQty + returnQty;
    const theoreticalStock = totalEntriesQty - outQty + adjustmentNet;
    const discrepancy = currentStockUnits - theoreticalStock;

    return {
      inQty,
      returnQty,
      totalEntriesQty,
      inCostValue,
      outQty,
      outSaleValue,
      outCostValue,
      outProfit: outSaleValue - outCostValue,
      transferQty,
      adjustmentNet,
      currentStockUnits,
      currentStockCost,
      currentStockSale,
      theoreticalStock,
      discrepancy,
    };
  }, [products, movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Cloisonnement strict Caissier : uniquement ses propres mouvements/ventes
      if (isCashier && activeAppUser) {
        const myName = (activeAppUser.fullName || '').toLowerCase();
        const myUser = (activeAppUser.username || '').toLowerCase();
        const op = (m.operator || '').toLowerCase();
        const matchesMe =
          (myName && op.includes(myName)) ||
          (myUser && op.includes(myUser)) ||
          m.targetUserId === activeAppUser.id;
        if (!matchesMe) return false;
      }

      const matchSearch =
        m.productName.toLowerCase().includes(search.toLowerCase()) ||
        m.productSku.toLowerCase().includes(search.toLowerCase()) ||
        m.reason.toLowerCase().includes(search.toLowerCase()) ||
        m.operator.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'all' || m.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [movements, search, typeFilter, isCashier, activeAppUser]);

  const exportCsv = () => {
    const headers = [
      'ID',
      'Date',
      'Heure',
      'SKU',
      'Produit',
      'Type',
      'Variation',
      'Stock Avant',
      'Stock Apres',
      'Motif',
      'Operateur',
      'Notes',
    ];

    const rows = filteredMovements.map((m) => {
      const d = new Date(m.createdAt);
      return [
        m.id,
        d.toLocaleDateString('fr-FR'),
        d.toLocaleTimeString('fr-FR'),
        m.productSku,
        `"${m.productName.replace(/"/g, '""')}"`,
        m.type,
        m.quantityDelta,
        m.previousStock,
        m.newStock,
        `"${m.reason.replace(/"/g, '""')}"`,
        `"${m.operator.replace(/"/g, '""')}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stockflow_mouvements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isCashier ? 'Mes Opérations & Historique Ventes' : 'Bilan des Entrées / Sorties & Grand Livre'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isCashier
              ? `Historique de vos ventes et réceptions pour ${activeAppUser?.storeName || 'votre boutique'}.`
              : 'Synthèse comptable des flux de marchandises et traçabilité certifiée de chaque opération.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exporter CSV</span>
          </button>
          {!isCashier && movements.length > 0 && (
            <button
              onClick={() => {
                openConfirmModal(
                  "Purger tout l'historique des mouvements ?",
                  "Cette action supprimera tous les anciens mouvements et tickets enregistrés pour repartir sur un historique neuf avec vos vraies opérations de terrain. Les fiches d'articles et stocks actuels sont entièrement conservés. Voulez-vous continuer ?",
                  async () => {
                    await clearAllMovements();
                  },
                  true,
                  "Oui, effacer l'historique"
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-xs transition-colors whitespace-nowrap"
              title="Supprimer tous les mouvements de test"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Purger l'historique</span>
            </button>
          )}
          {!isCashier && (
            <button
              onClick={() => openMovementModal()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-600/20 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Consigner une transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* BILAN DES ENTRÉES ET SORTIES (Synthèse en 4 cartes) */}
      {!isCashier && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Carte 1 : Bilan des Entrées */}
          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Total Entrées (+ Retours)
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownRight className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 font-mono tabular-nums">
              +{bilan.totalEntriesQty.toLocaleString('fr-FR')} <span className="text-sm font-semibold">pcs</span>
            </div>
            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
              <div>
                Réceptions : <strong className="font-mono">+{bilan.inQty}</strong> | Retours clients :{' '}
                <strong className="font-mono">+{bilan.returnQty}</strong>
              </div>
              <div>
                Valeur d'achat entrée :{' '}
                <strong className="font-mono text-slate-900">
                  {bilan.inCostValue.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>
          </div>

          {/* Carte 2 : Bilan des Sorties (Ventes) */}
          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Total Sorties (Ventes)
              </span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-rose-600 font-mono tabular-nums">
              -{bilan.outQty.toLocaleString('fr-FR')} <span className="text-sm font-semibold">pcs</span>
            </div>
            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
              <div>
                Chiffre d'affaires :{' '}
                <strong className="font-mono text-slate-900">
                  {bilan.outSaleValue.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
              <div>
                Bénéfice sur sorties :{' '}
                <strong className="font-mono text-emerald-700">
                  +{bilan.outProfit.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>
          </div>

          {/* Carte 3 : Dotations Internes aux Boutiques */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Dotations Boutiques
              </span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <ArrowLeftRight className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-700 font-mono tabular-nums">
              {bilan.transferQty.toLocaleString('fr-FR')} <span className="text-sm font-semibold">pcs</span>
            </div>
            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
              <div>Répartition interne vers les caissiers</div>
              <div className="text-[11px] text-blue-700 font-medium">
                Ne diminue pas le stock global de l'entreprise
              </div>
            </div>
          </div>

          {/* Carte 4 : Solde & Équilibre du Stock */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Solde Stock Actuel
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  bilan.discrepancy === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {bilan.discrepancy === 0 ? '100% Équilibré' : `Écart: ${bilan.discrepancy}`}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 font-mono tabular-nums">
              {bilan.currentStockUnits.toLocaleString('fr-FR')} <span className="text-sm font-semibold">pcs</span>
            </div>
            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
              <div>
                Calcul : <strong className="font-mono">{bilan.totalEntriesQty}</strong> (Entrées){' '}
                <strong className="font-mono">-{bilan.outQty}</strong> (Sorties) ={' '}
                <strong className="font-mono">{bilan.theoreticalStock}</strong>
              </div>
              <div>
                Valeur marchande :{' '}
                <strong className="font-mono text-slate-900">
                  {bilan.currentStockSale.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par article, SKU, motif ou opérateur..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Type Filter Segmented Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/60 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous les flux ({movements.length})
            </button>
            <button
              onClick={() => setTypeFilter('IN')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'IN'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entrées ({movements.filter((m) => m.type === 'IN').length})
            </button>
            <button
              onClick={() => setTypeFilter('OUT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'OUT'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sorties / Ventes ({movements.filter((m) => m.type === 'OUT').length})
            </button>
            <button
              onClick={() => setTypeFilter('TRANSFER')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'TRANSFER'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dotations Boutiques ({movements.filter((m) => m.type === 'TRANSFER').length})
            </button>
            <button
              onClick={() => setTypeFilter('RETURN')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'RETURN'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Retours ({movements.filter((m) => m.type === 'RETURN').length})
            </button>
            <button
              onClick={() => setTypeFilter('ADJUSTMENT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'ADJUSTMENT'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ajustements ({movements.filter((m) => m.type === 'ADJUSTMENT').length})
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Article & SKU</th>
                <th className="py-3 px-4">Type d'Opération</th>
                <th className="py-3 px-4 text-right">Quantité</th>
                <th className="py-3 px-4 text-right">Impact Stock Global</th>
                <th className="py-3 px-4">Motif & Opérateur</th>
                <th className="py-3 px-4">Commentaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ArrowLeftRight className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Aucun mouvement trouvé.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Les transactions de stock validées apparaîtront ici avec horodatage certifié.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  const date = new Date(m.createdAt);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {date.toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {date.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Product & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {m.productName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {m.productSku}
                        </div>
                      </td>

                      {/* Type (Clean unboxed with icon) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          {m.type === 'IN' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Entrée Stock</span>
                            </span>
                          ) : m.type === 'OUT' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold">
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                              <span>Sortie / Vente</span>
                            </span>
                          ) : m.type === 'TRANSFER' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                              <span>Dotation Boutique</span>
                            </span>
                          ) : m.type === 'RETURN' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold">
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>Retour Client</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Ajustement</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Delta Quantity (Tabular numbers) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {m.type === 'TRANSFER' ? (
                          <span className="font-mono tabular-nums font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            Dotation : {Math.abs(m.quantityDelta)} pcs
                          </span>
                        ) : (
                          <span
                            className={`font-mono tabular-nums font-bold text-sm ${
                              isPositive
                                ? 'text-emerald-600'
                                : m.quantityDelta < 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                        )}
                      </td>

                      {/* Stock Evolution */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {m.type === 'TRANSFER' ? (
                          <span className="text-xs text-slate-500">
                            Stock global : <strong className="text-slate-800">{m.newStock}</strong>{' '}
                            <span className="text-[10px] text-blue-600">(interne)</span>
                          </span>
                        ) : (
                          <>
                            <span>{m.previousStock}</span>
                            <span className="text-slate-300 mx-1">→</span>
                            <span className="font-semibold text-slate-800">{m.newStock}</span>
                          </>
                        )}
                      </td>

                      {/* Reason & Operator */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="text-slate-800 truncate font-medium">
                          {m.reason}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Par : {m.operator}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-slate-500 italic max-w-[180px] truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
