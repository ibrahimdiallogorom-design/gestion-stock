import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, X, Cloud, HardDriveDownload } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { hasPendingOfflineData } from '../services/cloudSync';

export const OfflineSyncBanner: React.FC = () => {
  const { cloudStatus, forceSyncCloud } = useStock();

  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [justReconnected, setJustReconnected] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setIsDismissed(false);
      // Auto-hide success after 5 seconds
      setTimeout(() => {
        setJustReconnected(false);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      setIsDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check for pending offline items
    const interval = setInterval(() => {
      setHasPending(hasPendingOfflineData());
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isDismissed) return null;

  // 1. Situation : Hors-Ligne (Pas d'internet)
  if (!isOnline) {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs shadow-md border-b border-amber-500/50 flex items-center justify-between shrink-0 z-40 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold uppercase tracking-wide text-[11px] bg-black/20 px-2 py-0.5 rounded-full">
                Mode Hors-Ligne
              </span>
              <span className="font-bold text-white truncate text-[11px] sm:text-xs">
                Aucune connexion Internet requise
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-amber-100 mt-0.5 truncate sm:whitespace-normal">
              Vous pouvez continuer à vendre, saisir des articles et faire vos mouvements. Tout est sécurisé sur cet appareil et sera envoyé au Cloud dès le retour d'Internet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Masquer ce message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Situation : En cours de reconnexion et synchronisation automatique
  if (justReconnected || cloudStatus === 'connecting' || hasPending) {
    return (
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-3 sm:px-4 py-2 text-xs shadow-md border-b border-blue-500/50 flex items-center justify-between shrink-0 z-40 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-white">
              Connexion rétablie !
            </span>
            <span className="text-[11px] text-blue-100 ml-1.5 hidden sm:inline">
              Synchronisation automatique de vos données locales avec le Cloud en cours...
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              await forceSyncCloud();
            } catch (e) {}
          }}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[10px] transition-colors shrink-0"
        >
          Forcer la Synchro
        </button>
      </div>
    );
  }

  return null;
};
