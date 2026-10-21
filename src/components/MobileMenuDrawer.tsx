import React, { useState, useMemo } from 'react';
import {
  X,
  LayoutDashboard,
  Boxes,
  Store,
  ShoppingCart,
  Receipt,
  Calculator,
  ArrowLeftRight,
  Truck,
  FileSpreadsheet,
  Palette,
  Settings,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Share2,
  Users,
  Smartphone,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronRight,
  Lock,
  Sparkles,
  Type,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { ViewTab } from '../types';

export const MobileMenuDrawer: React.FC = () => {
  const {
    isMobileMenuOpen,
    closeMobileMenu,
    activeTab,
    setActiveTab,
    activeAppUser,
    products,
    isCashierUnlocked,
    openProductModal,
    openMovementModal,
    openDistributionModal,
    openSwitchAccountModal,
    openInstallModal,
    isLargeTextMode,
    toggleLargeTextMode,
    cloudStatus,
    surveys,
    openSurveyModal,
  } = useStock();

  const [query, setQuery] = useState('');

  if (!isMobileMenuOpen) return null;

  const isCashier = activeAppUser?.role === 'CASHIER';
  const myUserId = activeAppUser?.id;

  const myAssignedProducts = products.filter(
    (p) => (p.distributedQuantities?.[myUserId || ''] || 0) > 0
  );
  const myTotalUnits = myAssignedProducts.reduce(
    (acc, p) => acc + (p.distributedQuantities?.[myUserId || ''] || 0),
    0
  );

  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;

  interface MenuItem {
    id: ViewTab;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    badge?: string;
    badgeColor?: string;
    adminOnly?: boolean;
  }

  const allApps: MenuItem[] = [
    {
      id: 'dashboard',
      title: 'Tableau de bord',
      description: "Vue synthétique, KPIs de vente, santé du stock et alertes.",
      icon: <LayoutDashboard className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200',
    },
    {
      id: 'inventory',
      title: isCashier ? 'Stock de ma Boutique' : 'Catalogue & Gestion des Stocks',
      description: isCashier
        ? 'Articles attribués à votre caisse avec prix de vente.'
        : 'Inventaire complet, prix d’achat, marges, seuils et fiches articles.',
      icon: <Boxes className="w-6 h-6 text-indigo-600" />,
      color: 'bg-indigo-50 border-indigo-200',
      badge: isCashier
        ? `${myTotalUnits} art.`
        : lowStockCount + outOfStockCount > 0
        ? `${lowStockCount + outOfStockCount} alertes`
        : undefined,
      badgeColor: isCashier
        ? 'bg-blue-100 text-blue-800'
        : outOfStockCount > 0
        ? 'bg-rose-100 text-rose-800 font-bold'
        : 'bg-amber-100 text-amber-800',
    },
    {
      id: 'distribution',
      title: 'Grand Magasin & Caisses',
      description: 'Dotation multi-boutiques, transferts aux vendeurs et gestion du dépôt.',
      icon: <Store className="w-6 h-6 text-blue-700" />,
      color: 'bg-blue-50 border-blue-300',
      badge: 'Multi-Boutiques',
      badgeColor: 'bg-blue-100 text-blue-800 font-semibold',
      adminOnly: true,
    },
    {
      id: 'caisse',
      title: 'Caisse & Terminal de Vente',
      description: 'Encaissement rapide, espèces, crédits/acomptes, tickets et Z de caisse.',
      icon: <ShoppingCart className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200',
      badge: isCashierUnlocked ? 'Ouverte' : 'Code 🔒',
      badgeColor: isCashierUnlocked
        ? 'bg-emerald-100 text-emerald-800 font-bold'
        : 'bg-amber-100 text-amber-800 font-bold',
    },
    {
      id: 'reports',
      title: 'Rapports & Clôtures Caisses',
      description: 'Journal des ventes, récapitulatifs journaliers et clôture Z de caisse.',
      icon: <Receipt className="w-6 h-6 text-teal-600" />,
      color: 'bg-teal-50 border-teal-200',
      badge: 'Z Caisse',
      badgeColor: 'bg-teal-100 text-teal-800 font-bold',
    },
    {
      id: 'catalog',
      title: 'Catalogue Produits & WhatsApp',
      description: 'Photos des articles, vitrine commerciale et partage direct aux clients par WhatsApp.',
      icon: <Share2 className="w-6 h-6 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-300',
      badge: 'Photos & Envoi',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
    },
    {
      id: 'accounting',
      title: 'Comptabilité & Trésorerie',
      description: 'Bilan financier, dépenses, achats de marchandises et calcul du transport.',
      icon: <Calculator className="w-6 h-6 text-amber-600" />,
      color: 'bg-amber-50 border-amber-200',
      badge: 'Bilan & Coûts',
      badgeColor: 'bg-amber-100 text-amber-800 font-bold',
      adminOnly: true,
    },
    {
      id: 'surveys',
      title: 'Sondages & Visites Prospects',
      description: 'Comprendre pourquoi les visiteurs repartent sans acheter (prix, qualité, rupture) et CRM WhatsApp.',
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      color: 'bg-indigo-50 border-indigo-200',
      badge: surveys.length > 0 ? `${surveys.length} visites` : 'Nouveau',
      badgeColor: 'bg-indigo-100 text-indigo-800 font-bold',
    },
    {
      id: 'movements',
      title: 'Journal des Mouvements',
      description: 'Grand livre chronologique de toutes les entrées, sorties et ajustements.',
      icon: <ArrowLeftRight className="w-6 h-6 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200',
    },
    {
      id: 'suppliers',
      title: 'Fournisseurs & Réassort',
      description: 'Annuaire fournisseurs, délais de livraison et commandes de stock.',
      icon: <Truck className="w-6 h-6 text-sky-600" />,
      color: 'bg-sky-50 border-sky-200',
      adminOnly: true,
    },
    {
      id: 'sheets',
      title: 'Google Sheets & Synchronisation',
      description: 'Exportation automatique et synchronisation bidirectionnelle Google Drive.',
      icon: <FileSpreadsheet className="w-6 h-6 text-emerald-700" />,
      color: 'bg-emerald-50 border-emerald-300',
      adminOnly: true,
    },
    {
      id: 'design_system',
      title: 'Design & Univers Graphique',
      description: 'Personnalisation des 4 thèmes visuels (SaaS, Dark, Luxe, Nordique).',
      icon: <Palette className="w-6 h-6 text-violet-600" />,
      color: 'bg-violet-50 border-violet-200',
      adminOnly: true,
    },
    {
      id: 'settings',
      title: 'Paramètres de la Boutique',
      description: 'Configuration, comptes vendeurs, code secret de caisse et sauvegardes.',
      icon: <Settings className="w-6 h-6 text-slate-700" />,
      color: 'bg-slate-100 border-slate-300',
      adminOnly: true,
    },
  ];

  const visibleApps = allApps.filter((app) => {
    if (isCashier && app.adminOnly) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      app.title.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q)
    );
  });

  const handleSelectApp = (id: ViewTab) => {
    setActiveTab(id);
    closeMobileMenu();
  };

  const handleQuickAction = (action: () => void) => {
    action();
    closeMobileMenu();
  };

  const handlePurgeCache = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
    } catch (e) {}
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Background click dismiss */}
      <div className="flex-1" onClick={closeMobileMenu} />

      {/* Drawer Surface */}
      <div className="bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl border-t border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer" onClick={closeMobileMenu} />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-2 shadow-sm text-white shrink-0">
              <img src="./icon.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                Menu & Applications
              </h2>
              <p className="text-xs text-slate-500">
                Déroulez et touchez pour afficher en grand caractère
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMobileMenu}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grand Caractère Mode Switch & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          {/* Large Text Mode Toggle Banner */}
          <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Type className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block leading-tight">
                  Affichage Grand Caractère
                </span>
                <span className="text-xs text-slate-500">
                  {isLargeTextMode ? 'Actif : Textes et chiffres agrandis' : 'Standard : Taille normale'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleLargeTextMode}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                isLargeTextMode
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {isLargeTextMode ? '✓ ACTIVÉ' : 'DÉSACTIVÉ'}
            </button>
          </div>

          {/* Quick Search inside Menu */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une application ou fonction..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Scrollable Functions List ("Dérouler jusqu'à l'application voulue") */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main Applications Section */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 block">
              Toutes les Applications Disponibles
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {visibleApps.map((app) => {
                const isActive = activeTab === app.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleSelectApp(app.id)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 group active:scale-[0.98] ${
                      isActive
                        ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-400/30'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${app.color}`}
                      >
                        {app.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                            {app.title}
                          </span>
                          {app.badge && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                app.badgeColor || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {app.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                          {app.description}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                        isActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Action Shortcuts Section */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 block">
              Actions Rapides & Opérations
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {!isCashier && (
                <button
                  type="button"
                  onClick={() => handleQuickAction(() => openProductModal())}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left flex items-center gap-2.5 shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Nouvel Article</span>
                    <span className="text-[10px] text-slate-500">Ajouter produit</span>
                  </div>
                </button>
              )}

              {!isCashier && (
                <button
                  type="button"
                  onClick={() => handleQuickAction(() => openDistributionModal())}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left flex items-center gap-2.5 shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Distribuer Stock</span>
                    <span className="text-[10px] text-slate-500">Vers les caisses</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleQuickAction(() => openMovementModal(undefined, 'IN'))}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Entrée Stock</span>
                  <span className="text-[10px] text-slate-500">Réception usine</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction(() => openMovementModal(undefined, 'OUT'))}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-all text-left flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Sortie Stock</span>
                  <span className="text-[10px] text-slate-500">Prélèvement</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction(openSwitchAccountModal)}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all text-left flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Changer Compte</span>
                  <span className="text-[10px] text-slate-500">{activeAppUser?.fullName || 'Session'}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction(openInstallModal)}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-left flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Installer App</span>
                  <span className="text-[10px] text-slate-500">APPS PWA</span>
                </div>
              </button>
            </div>
          </div>

          {/* Purge & Reload Action */}
          <div className="pt-2 pb-4">
            <button
              type="button"
              onClick={handlePurgeCache}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
              <span>Actualiser l'application & vider le cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
