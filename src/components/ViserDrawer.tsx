import React, { useState } from 'react';
import {
  Target,
  X,
  Cloud,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  Smartphone,
  Plus,
  Share2,
  Users,
  ShoppingCart,
  Receipt,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Download,
  Lock,
  Palette,
  Settings,
  LogOut,
} from 'lucide-react';
import { useStock } from '../context/StockContext';

export const ViserDrawer: React.FC = () => {
  const {
    isViserOpen,
    closeViser,
    cloudStatus,
    cloudStatusMessage,
    forceSyncCloud,
    pullLatestFromCloud,
    openMovementModal,
    openProductModal,
    openDistributionModal,
    openInstallModal,
    openSwitchAccountModal,
    logoutAppUser,
    setActiveTab,
    isCashierUnlocked,
    activeAppUser,
    products,
    movements,
  } = useStock();

  const [syncFeedback, setSyncFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isViserOpen) return null;

  const isCashier = activeAppUser?.role === 'CASHIER';

  const handleForceSync = async () => {
    if (!navigator.onLine) {
      setSyncFeedback({
        text: 'Vous êtes actuellement hors-ligne. Vos données sont bien enregistrées sur votre appareil et seront envoyées automatiquement dès le retour d’Internet.',
      });
      setTimeout(() => setSyncFeedback(null), 6000);
      return;
    }

    setIsSyncing(true);
    setSyncFeedback({ text: 'Synchronisation Cloud en cours...' });
    try {
      await forceSyncCloud();
      setSyncFeedback({
        text: `Succès : ${products.length} article(s) et ${movements.length} mouvement(s) envoyés au Cloud !`,
      });
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (e) {
      setSyncFeedback({ text: 'Erreur lors de la synchronisation.', isError: true });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullCloud = async () => {
    setIsSyncing(true);
    setSyncFeedback({ text: 'Téléchargement depuis le Cloud...' });
    try {
      const res = await pullLatestFromCloud();
      setSyncFeedback({ text: res.message, isError: !res.success });
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (e) {
      setSyncFeedback({ text: 'Erreur de téléchargement.', isError: true });
    } finally {
      setIsSyncing(false);
    }
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

  const handleAction = (callback: () => void) => {
    callback();
    closeViser();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop tap to dismiss */}
      <div className="flex-1" onClick={closeViser} />

      {/* Sheet Content Container */}
      <div className="bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl border-t border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div
          className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer"
          onClick={closeViser}
        />

        {/* Header - Viser */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/20 shadow-inner shrink-0">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Viseur
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  Accès Direct
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Synchronisation Cloud, Entrées et Sorties de stock
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeViser}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body ("dérouler") */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Feedback banner */}
          {syncFeedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                syncFeedback.isError
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{syncFeedback.text}</span>
            </div>
          )}

          {/* 1. LA SYNCHRONISATION */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    1. La Synchronisation Cloud
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Partage en temps réel entre téléphones & ordinateurs
                  </span>
                </div>
              </div>

              {/* Status pill */}
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
                  cloudStatus === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    cloudStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {cloudStatus === 'connected' ? 'En Direct' : 'Synchro...'}
              </span>
            </div>

            {/* Sync Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleForceSync}
                disabled={isSyncing}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Forcer la Synchronisation Immédiate</span>
              </button>

              <button
                type="button"
                onClick={handlePullCloud}
                disabled={isSyncing}
                className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-blue-700 font-bold rounded-xl border border-blue-200 shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Recharger depuis le Cloud</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePurgeCache}
              className="w-full py-2 px-3 bg-white/80 hover:bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Actualiser l'application & vider le cache</span>
            </button>
          </div>

          {/* 2. LES ENTRÉES & 3. LES SORTIES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 2. LES ENTRÉES */}
            <button
              type="button"
              onClick={() => handleAction(() => openMovementModal(undefined, 'IN'))}
              className="w-full text-left p-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-300/80 shadow-2xs transition-all active:scale-[0.98] flex items-start gap-3.5 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <ArrowDownRight className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-emerald-950 leading-tight">
                    2. Les Entrées
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[10px] font-extrabold uppercase">
                    + Stock
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  Enregistrer une entrée de marchandises (réception fournisseur, réassort usine).
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-2 group-hover:underline">
                  Ajouter du stock &rarr;
                </span>
              </div>
            </button>

            {/* 3. LES SORTIES */}
            <button
              type="button"
              onClick={() => handleAction(() => openMovementModal(undefined, 'OUT'))}
              className="w-full text-left p-4 rounded-2xl bg-rose-50/80 hover:bg-rose-100/80 border border-rose-300/80 shadow-2xs transition-all active:scale-[0.98] flex items-start gap-3.5 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-rose-950 leading-tight">
                    3. Les Sorties
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-900 text-[10px] font-extrabold uppercase">
                    - Stock
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1">
                  Enregistrer une sortie de marchandises (vente directe, déstockage ou retrait).
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 mt-2 group-hover:underline">
                  Retirer du stock &rarr;
                </span>
              </div>
            </button>
          </div>

          {/* 4. L'APP (APPS PWA & APK) */}
          <button
            type="button"
            onClick={() => handleAction(openInstallModal)}
            className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-between gap-3 group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    4. L'App (APPS)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase">
                    PWA / APK
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  Installer sur téléphone Android, ajouter à l'écran d'accueil ou partager le QR code
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* AUTRES ACTIONS DU BANDEAU QUI NE SORTENT PAS SUR PETIT ÉCRAN */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 block">
              Autres Raccourcis du Bandeau Supérieur
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {!isCashier && (
                <button
                  type="button"
                  onClick={() => handleAction(() => openProductModal())}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Nouvel Article</span>
                    <span className="text-[10px] text-slate-500">Ajout avec transport</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAction(() => setActiveTab('catalog'))}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Catalogue WhatsApp</span>
                  <span className="text-[10px] text-slate-500">Photos & Envoi client</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => setActiveTab('caisse'))}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Caisse & Vente</span>
                  <span className="text-[10px] text-slate-500">
                    {isCashierUnlocked ? 'Ouverte' : 'Code PIN 🔒'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => setActiveTab('reports'))}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-teal-50 hover:border-teal-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Rapports</span>
                  <span className="text-[10px] text-slate-500">Z de caisse & ventes</span>
                </div>
              </button>

              {!isCashier && (
                <button
                  type="button"
                  onClick={() => handleAction(() => openDistributionModal())}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Distribuer Stock</span>
                    <span className="text-[10px] text-slate-500">Vers les vendeurs</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAction(openSwitchAccountModal)}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Changer Compte</span>
                  <span className="text-[10px] text-slate-500">{activeAppUser?.fullName || 'Vendeur'}</span>
                </div>
              </button>

              {!isCashier && (
                <button
                  type="button"
                  onClick={() => handleAction(() => setActiveTab('settings'))}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Paramètres</span>
                    <span className="text-[10px] text-slate-500">Configuration boutique</span>
                  </div>
                </button>
              )}

              {!isCashier && (
                <button
                  type="button"
                  onClick={() => handleAction(() => setActiveTab('design_system'))}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-violet-50 hover:border-violet-300 transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Design & Thèmes</span>
                    <span className="text-[10px] text-slate-500">4 univers visuels</span>
                  </div>
                </button>
              )}
            </div>

            {/* User Session & Logout for Mobile */}
            {activeAppUser && (
              <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                    {(activeAppUser.fullName || activeAppUser.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block leading-tight truncate">
                      {activeAppUser.fullName || activeAppUser.username}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {activeAppUser.storeName || (activeAppUser.role === 'ADMIN' ? 'Gérant Principal' : 'Caisse')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction(logoutAppUser)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
