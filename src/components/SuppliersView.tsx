import React, { useState } from 'react';
import {
  Truck,
  Phone,
  Mail,
  Clock,
  Star,
  Package,
  ArrowDownRight,
  Search,
  ExternalLink,
  PlusCircle,
  Building2,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Supplier, Product } from '../types';

export const SuppliersView: React.FC = () => {
  const { suppliers, products, openMovementModal } = useStock();
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contactName.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  const supplierProducts = products.filter((p) =>
    p.supplier.toLowerCase().includes(selectedSupplier?.name.toLowerCase() || '')
  );

  const lowStockCount = supplierProducts.filter((p) => p.quantity <= p.minThreshold).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Fournisseurs & Réapprovisionnement</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez votre carnet d'adresses fournisseurs, suivez les délais de livraison et planifiez vos commandes.
          </p>
        </div>
      </div>

      {/* Main Grid: Left column list of suppliers, Right column supplier details and associated products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Suppliers Directory */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un fournisseur..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-2">
            {filteredSuppliers.map((s) => {
              const isSelected = selectedSupplier?.id === s.id;
              const prodCount = products.filter((p) =>
                p.supplier.toLowerCase().includes(s.name.toLowerCase())
              ).length;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSupplierId(s.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-amber-600">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{s.rating}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                    <span>{s.category}</span>
                    <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                      {prodCount} article(s)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Supplier Details & Supplied Catalog */}
        {selectedSupplier && (
          <div className="lg:col-span-2 space-y-6">
            {/* Supplier Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                    {selectedSupplier.name[0]}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedSupplier.name}
                    </h2>
                    <span className="text-xs text-slate-500">
                      Contact : <strong>{selectedSupplier.contactName}</strong> · Rayon {selectedSupplier.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${selectedSupplier.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200/60"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contacter</span>
                  </a>
                </div>
              </div>

              {/* 3 Metric Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[11px] block">Délai de Livraison</span>
                  <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-slate-800 text-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>{selectedSupplier.leadTimeDays} jours ouvrés</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[11px] block">Minimum de Commande</span>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                    {selectedSupplier.minOrderAmount} € HT
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[11px] block">Articles à Réapprovisionner</span>
                  <div
                    className={`font-mono font-bold text-sm mt-1 ${
                      lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {lowStockCount} article(s) critique(s)
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedSupplier.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{selectedSupplier.phone}</span>
                </span>
              </div>
            </div>

            {/* Supplied Products Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Articles Référencés chez ce Fournisseur
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Niveaux de stock actuels et commandes de réassort
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {supplierProducts.length} référence(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4 text-right">Stock Actuel</th>
                      <th className="py-3 px-4 text-right">Seuil Min</th>
                      <th className="py-3 px-4 text-right">Prix Achat HT</th>
                      <th className="py-3 px-4 text-center">Action Réassort</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Aucun article associé à ce fournisseur dans le catalogue actuel.
                        </td>
                      </tr>
                    ) : (
                      supplierProducts.map((p) => {
                        const isOut = p.quantity === 0;
                        const isLow = p.quantity > 0 && p.quantity <= p.minThreshold;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{p.name}</div>
                              <div className="text-[11px] font-mono text-slate-400">{p.sku}</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`font-mono tabular-nums font-bold ${
                                  isOut
                                    ? 'text-rose-600'
                                    : isLow
                                    ? 'text-amber-600'
                                    : 'text-slate-800'
                                }`}
                              >
                                {p.quantity}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {isOut ? 'Rupture' : isLow ? 'Critique' : 'OK'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                              {p.minThreshold}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-700">
                              {p.costPrice.toFixed(2)} €
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => openMovementModal(p.id, 'IN')}
                                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/50 flex items-center gap-1 mx-auto"
                              >
                                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Commander</span>
                              </button>
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
        )}
      </div>
    </div>
  );
};
