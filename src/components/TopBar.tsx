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
  LayoutGrid,
  Target,
  Menu,
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
    openMobileMenu,
    openDirectSaleModal,
    openViser,
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
      case 'accounting':
        return 'Comptabilité & Trésorerie / Bilan, Coûts de Revient & Charges';
      case 'catalog':
        return 'Catalogue Produits / Vitrine Commerciale & WhatsApp';
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
    <header className="min-h-14 py-1.5 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between shrink-0 gap-3 z-20 overflow-x-auto no-scrollbar">
      {/* Left Zone: Breadcrumbs & Status Pills */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {/* Bouton MENU Indépendant pour Mobile (Accès Stock, Caisse, Comptabilité, Paramètres...) */}
        <button
          type="button"
          onClick={openMobileMenu}
          className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all shrink-0 whitespace-nowrap cursor-pointer"
          title="Ouvrir le Menu (Stock, Caisse, Comptabilité, Rapports, Paramètres...)"
        >
          <Menu className="w-4 h-4 text-white shrink-0" />
          <span className="tracking-tight uppercase">Menu</span>
        </button>

        <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate max-w-[160px] sm:max-w-[220px] xl:max-w-[280px] 2xl:max-w-none">
          {getBreadcrumbs()}
        </span>

        {sheetsSync.lastSyncedAt && activeTab !== 'design_system' && (
          <span className="hidden 2xl:inline-flex text-xs text-slate-400 items-center gap-1.5 pl-2 border-l border-slate-200 shrink-0 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-mono tabular-nums">
              Synchro :{' '}
              {new Date(sheetsSync.lastSyncedAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </span>
        )}

        {/* Real-time Cloud Firestore Multi-Device Live Indicator (Desktop only) */}
        <button
          type="button"
          onClick={forceSyncCloud}
          className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all shrink-0 whitespace-nowrap cursor-pointer ${
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
          <span className="hidden xl:inline">
            {cloudStatus === 'connected' ? 'Cloud Direct' : cloudStatusMessage}
          </span>
        </button>

        {/* Force Refresh & Purge Cache (Desktop only) */}
        <button
          type="button"
          onClick={async () => {
            try {
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) await r.unregister();
              }
            } catch (err) {
              console.warn('Cache purge error:', err);
            }
            window.location.reload();
          }}
          className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition-colors shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
          title="Forcer le rechargement de la dernière version du code (vider le cache PWA et rafraîchir)"
        >
          <RefreshCw className="w-3 h-3 text-slate-600 shrink-0" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Right Action Zone: Non-wrapping, properly spaced pills */}
      <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
        {/* Prominent VISEUR Button (Synchronisation Cloud, Entrées, Sorties) */}
        <button
          type="button"
          onClick={openViser}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black text-xs shadow-sm shadow-emerald-600/25 active:scale-95 transition-all shrink-0 whitespace-nowrap cursor-pointer"
          title="Viseur : Synchronisation Cloud, Entrées et Sorties de Stock"
        >
          <Target className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="tracking-tight uppercase">Viseur</span>
        </button>

        {/* Direct Link to Caisse / POS */}
        <button
          onClick={() => setActiveTab('caisse')}
          className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'caisse'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Accéder au terminal de caisse enregistreuse"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Caisse</span>
          {isCashierUnlocked ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Caisse ouverte" />
          ) : (
            <span title="Protégée par code PIN" className="inline-flex items-center shrink-0">
              <Lock className="w-3 h-3 text-slate-400" />
            </span>
          )}
        </button>

        {/* Direct Link to Reports */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Consulter les rapports de vente et Z de caisse"
        >
          <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Rapports</span>
        </button>

        {/* APPS Modal Button */}
        <button
          onClick={openInstallModal}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
          title="Installer l'application sur votre téléphone ou partager l'accès"
        >
          <Smartphone className="w-3.5 h-3.5 text-white shrink-0" />
          <span>APPS</span>
        </button>

        {/* Direct Link to Design System & Theme Inspector (Admin only) */}
        {!isCashier && (
          <button
            onClick={() => setActiveTab('design_system')}
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'design_system'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Consulter les choix graphiques, tokens et univers"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Design</span>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: currentTheme.accentColor }}
            />
          </button>
        )}

        {/* Google Sheets Quick Sync Button (Admin only) */}
        {!isCashier && hasGoogleToken && sheetsSync.spreadsheetId && (
          <button
            onClick={syncToSheetsAction}
            disabled={sheetsSync.status === 'syncing'}
            className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shrink-0 whitespace-nowrap cursor-pointer"
            title="Synchroniser immédiatement avec Google Sheets"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-600 shrink-0 ${
                sheetsSync.status === 'syncing' ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span>
              {sheetsSync.status === 'syncing' ? 'Synchro...' : 'Sheets'}
            </span>
          </button>
        )}

        {/* Quick Movements (Admin only) */}
        {!isCashier && (
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => openDirectSaleModal()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              title="Vendre directement depuis le Grand Magasin (sans passer par la caisse)"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Vendre</span>
            </button>
            <button
              onClick={() => openMovementModal(undefined, 'IN')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-800 bg-white hover:bg-emerald-50 rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              title="Enregistrer une entrée en stock (réception fournisseur)"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Entrée</span>
            </button>
            <button
              onClick={() => openMovementModal(undefined, 'OUT')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-800 bg-white hover:bg-rose-50 rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              title="Enregistrer une sortie de stock (vente ou prélèvement)"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Sortie</span>
            </button>
          </div>
        )}

        {/* Add Product CTA (Admin only) */}
        {!isCashier && (
          <button
            onClick={() => openProductModal()}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-600/20 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            title="Ajouter un nouvel article au catalogue"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">Nouvel Article</span>
          </button>
        )}

        {/* Direct Settings Shortcut (Admin only) */}
        {!isCashier && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Ouvrir les Paramètres de la boutique"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="hidden 2xl:inline">Paramètres</span>
          </button>
        )}
      </div>
    </header>
  );
};
