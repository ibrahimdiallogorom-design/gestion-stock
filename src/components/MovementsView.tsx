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
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { MovementType } from '../types';

export const MovementsView: React.FC = () => {
  const { movements, openMovementModal } = useStock();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | 'all'>('all');

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchSearch =
        m.productName.toLowerCase().includes(search.toLowerCase()) ||
        m.productSku.toLowerCase().includes(search.toLowerCase()) ||
        m.reason.toLowerCase().includes(search.toLowerCase()) ||
        m.operator.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'all' || m.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [movements, search, typeFilter]);

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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Grand Livre des Mouvements de Stock
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Traçabilité complète et inaltérable de toutes les entrées, sorties, retours et inventaires.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={() => openMovementModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-600/20 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Consigner une transaction</span>
          </button>
        </div>
      </div>

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
              Entrées (Réceptions)
            </button>
            <button
              onClick={() => setTypeFilter('OUT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'OUT'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sorties (Ventes/Pertes)
            </button>
            <button
              onClick={() => setTypeFilter('ADJUSTMENT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'ADJUSTMENT'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ajustements
            </button>
            <button
              onClick={() => setTypeFilter('RETURN')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                typeFilter === 'RETURN'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Retours
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
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Variation</th>
                <th className="py-3 px-4 text-right">Évolution Stock</th>
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
                            <>
                              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Entrée</span>
                            </>
                          ) : m.type === 'OUT' ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                              <span>Sortie</span>
                            </>
                          ) : m.type === 'RETURN' ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>Retour</span>
                            </>
                          ) : (
                            <>
                              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Ajustement</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Delta Quantity (Tabular numbers) */}
                      <td className="py-3 px-4 text-right">
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
                      </td>

                      {/* Stock Evolution */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        <span>{m.previousStock}</span>
                        <span className="text-slate-300 mx-1">→</span>
                        <span className="font-semibold text-slate-800">{m.newStock}</span>
                      </td>

                      {/* Reason & Operator */}
                      <td className="py-3 px-4 max-w-[200px]">
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
