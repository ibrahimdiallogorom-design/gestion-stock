import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  FileSpreadsheet,
  Palette,
  Truck,
  Settings,
  Layers,
  ChevronRight,
  ShoppingCart,
  LogOut,
  UserCheck,
  Receipt,
  Users,
  Store,
  Share2,
  Smartphone,
  Download,
  Calculator,
  Type,
  ShieldCheck,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { ViewTab } from '../types';
import { THEME_CONFIGS } from './ThemeClasses';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    products,
    sheetsSync,
    hasGoogleToken,
    theme,
    isCashierUnlocked,
    activeAppUser,
    logoutAppUser,
    openSwitchAccountModal,
    openInstallModal,
    isLargeTextMode,
    toggleLargeTextMode,
    surveys,
  } = useStock();

  const isCashier = activeAppUser?.role === 'CASHIER';
  const myUserId = activeAppUser?.id;

  // Calcul spécifique pour le caissier : uniquement son stock doté
  const myAssignedProducts = products.filter(
    (p) => (p.distributedQuantities?.[myUserId || ''] || 0) > 0
  );
  const myTotalUnits = myAssignedProducts.reduce(
    (acc, p) => acc + (p.distributedQuantities?.[myUserId || ''] || 0),
    0
  );

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;

  const currentTheme = THEME_CONFIGS[theme];

  // Menu Caissier : Strictement restreint à ses prérogatives
  const cashierNavItems: {
    id: ViewTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'caisse',
      label: 'Caisse & Vente',
      icon: <ShoppingCart className="w-4 h-4" />,
      badge: isCashierUnlocked ? 'Ouverte' : 'Code 🔒',
      badgeColor: isCashierUnlocked
        ? 'text-emerald-700 bg-emerald-50 font-medium'
        : 'text-amber-800 bg-amber-50 font-medium',
    },
    {
      id: 'inventory',
      label: 'Stock de ma Boutique',
      icon: <Boxes className="w-4 h-4" />,
      badge: myTotalUnits > 0 ? `${myTotalUnits} art.` : '0 art.',
      badgeColor: 'text-blue-700 bg-blue-50 font-medium',
    },
    {
      id: 'reports',
      label: 'Mes Rapports & Z Caisse',
      icon: <Receipt className="w-4 h-4" />,
      badge: 'Z Caisse',
      badgeColor: 'text-emerald-700 bg-emerald-50 font-bold',
    },
    {
      id: 'catalog',
      label: 'Catalogue & WhatsApp',
      icon: <Share2 className="w-4 h-4" />,
      badge: 'Photos',
      badgeColor: 'text-emerald-700 bg-emerald-50 font-bold',
    },
    {
      id: 'surveys',
      label: 'Sondages & Visites',
      icon: <Users className="w-4 h-4" />,
      badge: surveys.length > 0 ? `${surveys.length} vis.` : 'Nouveau',
      badgeColor: 'text-indigo-700 bg-indigo-50 font-bold',
    },
    {
      id: 'dashboard',
      label: 'Mon Tableau de Bord',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'movements',
      label: 'Mes Mouvements',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
  ];

  // Menu Administrateur : Accès complet
  const adminNavItems: {
    id: ViewTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'inventory',
      label: 'Catalogue & Stocks',
      icon: <Boxes className="w-4 h-4" />,
      badge: lowStockCount + outOfStockCount > 0 ? lowStockCount + outOfStockCount : undefined,
      badgeColor: outOfStockCount > 0 ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50',
    },
    {
      id: 'catalog',
      label: 'Catalogue & WhatsApp',
      icon: <Share2 className="w-4 h-4" />,
      badge: 'Photos & Envoi',
      badgeColor: 'text-emerald-700 bg-emerald-50 font-bold',
    },
    {
      id: 'distribution',
      label: 'Grand Magasin & Caisses',
      icon: <Store className="w-4 h-4" />,
      badge: 'Multi-Boutiques',
      badgeColor: 'text-blue-700 bg-blue-50 font-medium',
    },
    {
      id: 'caisse',
      label: 'Caisse & Vente',
      icon: <ShoppingCart className="w-4 h-4" />,
      badge: isCashierUnlocked ? 'Ouverte' : 'Code 🔒',
      badgeColor: isCashierUnlocked
        ? 'text-emerald-700 bg-emerald-50 font-medium'
        : 'text-amber-800 bg-amber-50 font-medium',
    },
    {
      id: 'reports',
      label: 'Rapports & Caisses',
      icon: <Receipt className="w-4 h-4" />,
      badge: 'Z Caisse',
      badgeColor: 'text-emerald-700 bg-emerald-50 font-bold',
    },
    {
      id: 'accounting',
      label: 'Comptabilité & Trésorerie',
      icon: <Calculator className="w-4 h-4" />,
      badge: 'Bilan & Coûts',
      badgeColor: 'text-amber-800 bg-amber-50 font-semibold',
    },
    {
      id: 'audit',
      label: 'Contrôle des chiffres',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'Audit',
      badgeColor: 'text-red-700 bg-red-50 font-bold',
    },
    {
      id: 'surveys',
      label: 'Sondages & Visites',
      icon: <Users className="w-4 h-4" />,
      badge: surveys.length > 0 ? `${surveys.length} vis.` : 'Nouveau',
      badgeColor: 'text-indigo-700 bg-indigo-50 font-bold',
    },
    {
      id: 'movements',
      label: 'Journal des flux',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs & Réassort',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      id: 'sheets',
      label: 'Google Sheets',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: hasGoogleToken ? 'Sync' : undefined,
      badgeColor: 'text-emerald-700 bg-emerald-50',
    },
    {
      id: 'design_system',
      label: 'Design & UI Kit',
      icon: <Palette className="w-4 h-4" />,
      badge: '4 Thèmes',
      badgeColor: 'text-indigo-700 bg-indigo-50 font-semibold',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const navItems = isCashier ? cashierNavItems : adminNavItems;

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 select-none h-full overflow-hidden">
      {/* Top Zone: Brand & Navigation */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Brand Header */}
        <div className="p-3 border-b border-slate-200 shrink-0 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center p-1 shadow-2xs bg-white border border-slate-200 overflow-hidden shrink-0">
              <img src="./icon.png" alt="Logo Vision Tech" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight truncate">
                Boutique VisionTech
              </span>
              <span className="text-[10px] text-slate-500 tracking-normal block truncate">
                {currentTheme.name}
              </span>
            </div>
          </div>

          {/* Active User session pill + Switch Account */}
          {activeAppUser && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      activeAppUser.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {activeAppUser.role === 'ADMIN' ? 'AD' : 'CS'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 block text-[11px] truncate leading-tight">
                      {activeAppUser.fullName || activeAppUser.username}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {activeAppUser.storeName || (activeAppUser.role === 'ADMIN' ? 'Administrateur' : 'Poste Caisse')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logoutAppUser}
                  title="Déconnexion (retour à l'écran de mot de passe)"
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={openSwitchAccountModal}
                className="w-full flex items-center justify-between py-1.5 px-2.5 bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Changer de boutique ou basculer vers un compte caissier"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Changer de compte</span>
                </div>
                <span className="text-[9px] bg-blue-200/80 text-blue-900 font-bold px-1.5 py-0.5 rounded font-mono shrink-0">
                  Bascule
                </span>
              </button>
            </div>
          )}
        </div>

        {/* All Navigation Links - Smoothly Scrollable with clean spacing */}
        <nav className="px-2.5 py-2 space-y-0.5 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Principal
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isSettings = item.id === 'settings';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : isSettings
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 ${
                      isActive
                        ? 'text-blue-600'
                        : isSettings
                        ? 'text-slate-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Zone: Compact Status & Quick Tools */}
      <div className="p-2.5 border-t border-slate-200 bg-slate-50/60 space-y-1.5 shrink-0">
        {/* Install Mobile App / Download APK Button */}
        <button
          onClick={openInstallModal}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="text-xs truncate">Installer l'App / APK</span>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono shrink-0">
            1 Clic
          </span>
        </button>

        {/* Compact 2-column row: Theme + Grand Caractère */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setActiveTab('design_system')}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-left hover:border-slate-300 transition-colors shadow-2xs min-w-0 cursor-pointer"
            title={`Thème actif : ${currentTheme.name}`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: currentTheme.accentColor }}
              />
              <span className="text-[10px] font-medium text-slate-800 truncate">
                Thème
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={toggleLargeTextMode}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 transition-colors text-left min-w-0 cursor-pointer"
            title="Activer ou désactiver l'affichage en grand caractère"
          >
            <div className="flex items-center gap-1 min-w-0">
              <Type className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="text-[10px] font-semibold text-slate-800 truncate">
                Texte XL
              </span>
            </div>
            <span
              className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${
                isLargeTextMode ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isLargeTextMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Google Sheets Sync status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                hasGoogleToken
                  ? sheetsSync.status === 'error'
                    ? 'bg-rose-500'
                    : 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-300'
              }`}
            />
            <span className="truncate">
              {hasGoogleToken ? 'Sheets connecté' : 'Mode local'}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('sheets')}
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline shrink-0 cursor-pointer"
          >
            Sync
          </button>
        </div>
      </div>
    </aside>
  );
};
