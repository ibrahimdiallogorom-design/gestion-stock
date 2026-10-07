import React from 'react';
import {
  Plus,
  RefreshCw,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  Palette,
  Sparkles,
  Settings,
  ShoppingCart,
  Lock,
  LogOut,
  User,
  Receipt,
  Users,
  Cloud,
  Smartphone,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { THEME_CONFIGS } from './ThemeClasses';

export const TopBar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    openMovementModal,
    openProductModal,
    sheetsSync,
    syncToSheetsAction,
    hasGoogleToken,
    currentUser,
    theme,
    isCashierUnlocked,
    activeAppUser,
    logoutAppUser,
    openSwitchAccountModal,
    cloudStatus,
    cloudStatusMessage,
    forceSyncCloud,
    openInstallModal,
  } = useStock();

  const currentTheme = THEME_CONFIGS[theme];
  const isCashier = activeAppUser?.role === 'CASHIER';

  const getBreadcrumbs = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Tableau de bord / Vue Synthétique';
      case 'inventory':
        return 'Inventaire / Catalogue & Niveaux de Stock';
      case 'caisse':
        return 'Caisse / Terminal Point de Vente & Encaissement';
      case 'reports':
        return 'Rapports & Clôtures / Ventes Quotidiennes & Z de Caisse';
      case 'movements':
        return 'Journal des Flux / Grand Livre des Mouvements';
      case 'suppliers':
        return 'Approvisionnement / Annuaire Fournisseurs & Commandes';
      case 'sheets':
        return 'Intégrations / Synchronisation Google Sheets';
      case 'design_system':
        return 'Charte & Spécifications / Système de Design & UI Kit';
      case 'settings':
        return 'Configuration / Paramètres de la Boutique';
      default:
        return 'Boutique VisionTech';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      {/* Breadcrumbs Trail */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900 tracking-tight">
          {getBreadcrumbs()}
        </span>
        {sheetsSync.lastSyncedAt && activeTab !== 'design_system' && (
          <span className="hidden sm:inline-flex text-xs text-slate-400 items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono tabular-nums">
              Synchro :{' '}
              {new Date(sheetsSync.lastSyncedAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </span>
        )}

        {/* Real-time Cloud Firestore Multi-Device Live Indicator */}
        <button
          type="button"
          onClick={forceSyncCloud}
          className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all ${
            cloudStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : cloudStatus === 'connecting'
              ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title="Synchronisation Cloud en direct active. Cliquez pour forcer une synchronisation instantanée."
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              cloudStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : cloudStatus === 'connecting'
                ? 'bg-blue-500 animate-spin'
                : 'bg-slate-400'
            }`}
          />
          <Cloud className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="hidden sm:inline">
            {cloudStatus === 'connected' ? 'Cloud Synchro En Direct' : cloudStatusMessage}
          </span>
          <span className="sm:hidden">
            {cloudStatus === 'connected' ? 'Cloud En Direct' : 'Synchro...'}
          </span>
        </button>
      </div>

      {/* Action Zone */}
      <div className="flex items-center gap-3">
        {/* Direct Link to Caisse / POS */}
        <button
          onClick={() => setActiveTab('caisse')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
            activeTab === 'caisse'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Accéder au terminal de caisse enregistreuse"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Caisse</span>
          {isCashierUnlocked ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Caisse ouverte" />
          ) : (
            <span title="Protégée par code PIN" className="inline-flex items-center">
              <Lock className="w-3 h-3 text-slate-400" />
            </span>
          )}
        </button>

        {/* Direct Link to Reports */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
            activeTab === 'reports'
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Consulter les rapports de vente et Z de caisse"
        >
          <Receipt className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Rapports</span>
        </button>

        {/* APPS Modal Button */}
        <button
          onClick={openInstallModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs"
          title="Installer l'application sur votre téléphone ou partager l'accès"
        >
          <Smartphone className="w-3.5 h-3.5 text-white" />
          <span>APPS</span>
        </button>

        {/* Direct Link to Design System & Theme Inspector (Admin only) */}
        {!isCashier && (
          <button
            onClick={() => setActiveTab('design_system')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
              activeTab === 'design_system'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Consulter les choix graphiques, tokens et univers"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Explorer le Design</span>
            <span
              className="w-2 h-2 rounded-full ml-0.5"
              style={{ backgroundColor: currentTheme.accentColor }}
            />
          </button>
        )}

        {/* Google Sheets Quick Sync Button (Admin only) */}
        {!isCashier && hasGoogleToken && sheetsSync.spreadsheetId && (
          <button
            onClick={syncToSheetsAction}
            disabled={sheetsSync.status === 'syncing'}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="Synchroniser immédiatement avec Google Sheets"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-600 ${
                sheetsSync.status === 'syncing' ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span>
              {sheetsSync.status === 'syncing' ? 'Synchro en cours...' : 'Synchroniser Sheets'}
            </span>
          </button>
        )}

        {/* Quick Movements (Admin only) */}
        {!isCashier && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => openMovementModal(undefined, 'IN')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-white hover:bg-emerald-50 rounded-md shadow-xs transition-colors"
              title="Enregistrer une entrée en stock (réception fournisseur)"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Entrée</span>
            </button>
            <button
              onClick={() => openMovementModal(undefined, 'OUT')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-800 bg-white hover:bg-rose-50 rounded-md shadow-xs transition-colors"
              title="Enregistrer une sortie de stock (vente ou prélèvement)"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Sortie</span>
            </button>
          </div>
        )}

        {/* Add Product CTA (Admin only) */}
        {!isCashier && (
          <button
            onClick={() => openProductModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-600/20 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvel Article</span>
          </button>
        )}

        {/* Direct Settings Shortcut (Admin only) */}
        {!isCashier && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Ouvrir les Paramètres de la boutique"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Paramètres</span>
          </button>
        )}

        {/* Active Application User Profile & Switch Account / Logout */}
        {activeAppUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {activeAppUser.fullName || activeAppUser.username}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {activeAppUser.storeName || (activeAppUser.role === 'ADMIN' ? 'Gérant' : 'Caisse')}
              </span>
            </div>

            <button
              onClick={openSwitchAccountModal}
              title="Changer de compte ou de boutique"
              className="px-2 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline text-[11px]">Changer de compte</span>
            </button>

            <button
              onClick={logoutAppUser}
              title="Verrouiller la session / Se déconnecter"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
