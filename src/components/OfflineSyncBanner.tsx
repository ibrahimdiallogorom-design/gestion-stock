import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, X, HardDriveDownload } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { hasPendingOfflineData, getPendingOfflineCount, flushOfflineQueue } from '../services/cloudSync';

export const OfflineSyncBanner: React.FC = () => {
  const { cloudStatus, forceSyncCloud, products } = useStock();

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justSynced, setJustSynced] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingOfflineCount());
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  useEffect(() => {
    const refreshPending = () => {
      const count = getPendingOfflineCount();
      setPendingCount((prev) => {
        if (prev > 0 && count === 0 && navigator.onLine) {
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 6000);
        }
        return count;
      });
    };

    const handleOnline = async () => {
      setIsOnline(true);
      setIsDismissed(false);
      if (hasPendingOfflineData()) {
        setIsSyncingNow(true);
        try {
          await flushOfflineQueue();
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 6000);
        } catch (e) {
          // Sera réessayé automatiquement toutes les 10s
        } finally {
          setIsSyncingNow(false);
          refreshPending();
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustSynced(false);
      setIsDismissed(false);
      refreshPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(refreshPending, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isDismissed) return null;

  // 1. Situation : Hors-Ligne ou Connexion Sahel Trop Faible
  if (!isOnline || cloudStatus === 'offline') {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 sm:px-4 py-2 text-xs shadow-md border-b border-amber-500/50 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold uppercase tracking-wide text-[10px] bg-black/25 px-2 py-0.5 rounded-full">
                Mode Hors-Ligne Sahel Actif
              </span>
              {pendingCount > 0 ? (
                <span className="font-bold text-amber-950 bg-amber-200 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                  <HardDriveDownload className="w-3 h-3" />
                  {pendingCount} modification(s) enregistrée(s) en attente de réseau
                </span>
              ) : (
                <span className="font-semibold text-white/95 text-[11px] truncate">
                  {products.length} articles disponibles — Saisie 100% autonome sans Internet
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-amber-100 mt-0.5 truncate sm:whitespace-normal">
              Ouvrez, vendez et saisissez vos articles librement sans connexion. Toutes vos opérations sont gardées en mémoire et seront envoyées automatiquement dès que le réseau reviendra.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Masquer ce bandeau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Situation : Envoi automatique des données hors-ligne en cours dès le retour de la connexion
  if (isSyncingNow || pendingCount > 0 || cloudStatus === 'connecting') {
    return (
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-3 sm:px-4 py-2 text-xs shadow-md border-b border-blue-500/50 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-white">
              {pendingCount > 0
                ? `Envoi automatique de ${pendingCount} modification(s) hors-ligne vers le Cloud...`
                : 'Connexion au Cloud VisionTech...'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            setIsSyncingNow(true);
            try {
              await flushOfflineQueue();
              await forceSyncCloud();
              setJustSynced(true);
              setTimeout(() => setJustSynced(false), 5000);
            } catch (e) {
            } finally {
              setIsSyncingNow(false);
            }
          }}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[10px] transition-colors shrink-0"
        >
          Synchroniser maintenant
        </button>
      </div>
    );
  }

  // 3. Situation : Confirmation verte après synchronisation automatique des saisies hors-ligne
  if (justSynced) {
    return (
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 sm:px-4 py-2 text-xs shadow-md border-b border-emerald-500/50 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span className="font-bold">
            Synchronisation terminée ! Toutes vos saisies faites hors-ligne ont été mises à jour dans le Cloud.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setJustSynced(false)}
          className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
};
