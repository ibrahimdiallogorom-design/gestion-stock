import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  Palette,
  Settings,
  ShoppingCart,
  Lock,
  LogOut,
  Receipt,
  Users,
  Cloud,
  Smartphone,
  Target,
  Menu,
  ChevronDown,
  Layers,
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

  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTheme = THEME_CONFIGS[theme];
  const isCashier = activeAppUser?.role === 'CASHIER';

  const getBreadcrumbs = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Tableau de bord';
      case 'inventory':
        return 'Catalogue & Stocks';
      case 'distribution':
        return 'Grand Magasin & Caisses';
      case 'caisse':
        return 'Terminal de Caisse';
      case 'reports':
        return 'Rapports & Z de Caisse';
      case 'accounting':
        return 'Comptabilité & Bilan';
      case 'audit':
        return 'Contrôle des Chiffres';
      case 'surveys':
        return 'Sondages & Visites';
      case 'catalog':
        return 'Catalogue & WhatsApp';
      case 'movements':
        return 'Journal des Flux';
      case 'suppliers':
        return 'Fournisseurs';
      case 'sheets':
        return 'Google Sheets';
      case 'design_system':
        return 'Design & Thèmes';
      case 'settings':
        return 'Paramètres';
      default:
        return 'Boutique VisionTech';
    }
  };

  const handleHardRefresh = async () => {
    setIsToolsDropdownOpen(false);
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
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 gap-3 relative z-30">
      {/* Zone Gauche : Titre de l'onglet actif + Bouton Menu Mobile */}
      <div className="flex items-center gap-2.5 min-w-0 shrink">
        <button
          type="button"
          onClick={openMobileMenu}
          className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-sm transition-all shrink-0 whitespace-nowrap cursor-pointer"
          title="Ouvrir le Menu"
        >
          <Menu className="w-4 h-4 text-white shrink-0" />
          <span className="tracking-tight uppercase">Menu</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
            {getBreadcrumbs()}
          </span>
          <span
            onClick={forceSyncCloud}
            title={
              cloudStatus === 'connected'
                ? 'Cloud synchronisé en direct (cliquer pour synchroniser)'
                : cloudStatusMessage
            }
            className={`w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer ${
              cloudStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : cloudStatus === 'connecting'
                ? 'bg-blue-500 animate-spin'
                : 'bg-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Zone Droite : Boutons 100% INDIVIDUELS + Barre déroulante "Outils & Actions" */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 1. Bouton individuel : VISEUR */}
        <button
          type="button"
          onClick={openViser}
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-xs active:scale-95 transition-all shrink-0 whitespace-nowrap cursor-pointer"
          title="Viseur : Synchronisation Cloud, Entrées et Sorties de Stock"
        >
          <Target className="w-4 h-4 text-white shrink-0" />
          <span className="tracking-tight uppercase">Viseur</span>
        </button>

        {/* 2. Bouton individuel : VENDRE (Grand Magasin) */}
        {!isCashier && (
          <button
            type="button"
            onClick={() => openDirectSaleModal()}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs active:scale-95 transition-all shrink-0 whitespace-nowrap cursor-pointer"
            title="Vendre directement depuis le Grand Magasin (sans passer par la caisse)"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Vendre</span>
          </button>
        )}

        {/* 3. Bouton individuel : ENTRÉE */}
        {!isCashier && (
          <button
            type="button"
            onClick={() => openMovementModal(undefined, 'IN')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shrink-0 whitespace-nowrap cursor-pointer"
            title="Enregistrer une entrée en stock (réception fournisseur)"
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Entrée</span>
          </button>
        )}

        {/* 4. Bouton individuel : SORTIE */}
        {!isCashier && (
          <button
            type="button"
            onClick={() => openMovementModal(undefined, 'OUT')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shrink-0 whitespace-nowrap cursor-pointer"
            title="Enregistrer une sortie de stock"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Sortie</span>
          </button>
        )}

        {/* 5. Bouton individuel : CAISSE */}
        <button
          type="button"
          onClick={() => setActiveTab('caisse')}
          className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'caisse'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Accéder au terminal de caisse enregistreuse"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Caisse</span>
          {isCashierUnlocked ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Caisse ouverte" />
          ) : (
            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
          )}
        </button>

        {/* 6. Bouton individuel : RAPPORTS */}
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Consulter les rapports de vente et Z de caisse"
        >
          <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Rapports</span>
        </button>

        {/* 7. Bouton individuel : NOUVEL ARTICLE */}
        {!isCashier && (
          <button
            type="button"
            onClick={() => openProductModal()}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all shrink-0 whitespace-nowrap cursor-pointer"
            title="Ajouter un nouvel article au catalogue"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Nouvel Article</span>
          </button>
        )}

        {/* 8. Barre déroulante cliquable : TOUS LES AUTRES OUTILS & ACTIONS */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsToolsDropdownOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              isToolsDropdownOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title="Cliquer pour dérouler tous les outils et raccourcis"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Plus d'options</span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                isToolsDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isToolsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 divide-y divide-slate-100">
              {/* Section Actions Rapides */}
              <div className="px-2 py-1.5 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Actions & Navigation
                </div>
                {!isCashier && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsDropdownOpen(false);
                        openDirectSaleModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Vendre (Grand Magasin)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsDropdownOpen(false);
                        openMovementModal(undefined, 'IN');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <ArrowDownRight className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Entrée de Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsDropdownOpen(false);
                        openMovementModal(undefined, 'OUT');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Sortie de Stock</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    setActiveTab('reports');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Rapports & Z de Caisse</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    openInstallModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Installer l'App / APK (APPS)</span>
                </button>
                {!isCashier && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      setActiveTab('design_system');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Explorer le Design</span>
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: currentTheme.accentColor }}
                    />
                  </button>
                )}
              </div>

              {/* Section Synchronisation & Système */}
              <div className="px-2 py-1.5 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Synchronisation & Système
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsDropdownOpen(false);
                    forceSyncCloud();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Cloud Synchro En Direct</span>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      cloudStatus === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleHardRefresh}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Actualiser l'App (Vider cache)</span>
                </button>

                {!isCashier && hasGoogleToken && sheetsSync.spreadsheetId && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      syncToSheetsAction();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Synchroniser Google Sheets</span>
                  </button>
                )}

                {!isCashier && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      setActiveTab('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Paramètres de la Boutique</span>
                  </button>
                )}
              </div>

              {/* Section Compte Utilisateur */}
              {activeAppUser && (
                <div className="px-2 pt-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      openSwitchAccountModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Changer de compte</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      logoutAppUser();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
