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
  } = useStock();

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minThreshold).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;

  const currentTheme = THEME_CONFIGS[theme];

  const navItems: {
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

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 select-none h-full overflow-hidden">
      {/* Top Zone: Brand & Navigation */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 shrink-0 space-y-2.5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: currentTheme.accentColor }}
            >
              <Boxes className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight truncate">
                Boutique VisionTech
              </span>
              <span className="text-[10px] text-slate-500 tracking-normal block truncate">
                {currentTheme.name}
              </span>
            </div>
          </div>

          {/* Active User session pill */}
          {activeAppUser && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
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
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={openSwitchAccountModal}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                title="Changer de boutique ou basculer vers un compte caissier"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Changer de compte</span>
              </button>
            </div>
          )}
        </div>

        {/* All Navigation Links - Smoothly Scrollable with 0 item cutoffs */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Principal
          </div>

          <button
            type="button"
            onClick={openSwitchAccountModal}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50/60 hover:bg-blue-100 border border-blue-200/60 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Changer de compte</span>
            </div>
            <span className="text-[10px] bg-blue-200/80 text-blue-900 font-bold px-1.5 py-0.5 rounded font-mono">
              Bascule
            </span>
          </button>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isSettings = item.id === 'settings';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : isSettings
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={
                      isActive
                        ? 'text-blue-600'
                        : isSettings
                        ? 'text-slate-600'
                        : 'text-slate-400'
                    }
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Zone: Status & Theme Shortcut */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 space-y-2">
        {/* Theme pill */}
        <button
          onClick={() => setActiveTab('design_system')}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-left hover:border-slate-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentTheme.accentColor }}
            />
            <span className="text-[11px] font-medium text-slate-800 truncate">
              {currentTheme.name}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Google Sheets Sync status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
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
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline shrink-0"
          >
            Sync
          </button>
        </div>
      </div>
    </aside>
  );
};
