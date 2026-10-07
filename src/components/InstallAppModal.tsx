import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  Share2,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
  Cloud,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect if already installed as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Capture beforeinstallprompt for Android Chrome / PC Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert("Sur iPhone / iPad :\n1. Appuyez sur le bouton Partager en bas (icône rectangle avec flèche vers le haut ⎋)\n2. Choisissez 'Sur l'écran d'accueil'\n3. Cliquez sur 'Ajouter' en haut à droite !");
    } else {
      alert("Sur votre navigateur Android :\nAppuyez sur les 3 points en haut à droite (⋮) puis cliquez sur 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
    }
  };

  const currentUrl = window.location.origin + window.location.pathname;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    });
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Voici l'application Boutique Moussa Vision (Gestion de Stock & Caisse en direct) :\n${currentUrl}\nOuvrez ce lien sur votre téléphone et cliquez sur 'Installer l'application' !`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-0.5 shadow-xs shrink-0 overflow-hidden">
              <img src="./icon.png" alt="Vision Tech" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Installer l'Application Mobile
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h2>
              <p className="text-xs text-blue-100">
                Raccourci 1 clic ou Fichier APK pour WhatsApp & Xender
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Method 1: PWA Instant Add to Home Screen */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    Installation Directe sur Téléphone (1 Clic)
                    <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                      ⭐ RECOMMANDÉ • 100% À JOUR
                    </span>
                  </h3>
                  <p className="text-slate-600 text-[11px]">
                    Installe l'icône Vision Tech sur votre écran d'accueil. Lancement plein écran immédiat avec la boutique actuelle et synchronisation Cloud automatique.
                  </p>
                </div>
              </div>
            </div>

            {isInstalled ? (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-900 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>L'application est déjà installée sur cet appareil !</span>
              </div>
            ) : (
              <button
                onClick={handleInstallPWA}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Smartphone className="w-4 h-4" />
                <span>Installer la Boutique Vision Tech sur mon Téléphone</span>
              </button>
            )}

            {isIOS && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">Instructions Safari iPhone / iPad :</p>
                <p>1. Cliquez sur l'icône Partager <strong>⎋</strong> en bas de l'écran.</p>
                <p>2. Choisissez <strong>"Sur l'écran d'accueil"</strong> (icône ➕).</p>
                <p>3. Cliquez sur <strong>Ajouter</strong>.</p>
              </div>
            )}
          </div>

          {/* Method 2: Share link via WhatsApp to Caissiers */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  Partager l'App aux Caissiers par WhatsApp
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Instantané
                  </span>
                </h3>
                <p className="text-slate-600 text-[11px]">
                  Envoyez l'accès direct en 1 clic par WhatsApp. Vos caissiers auront immédiatement la dernière version sur leur téléphone sans fichier lourd.
                </p>
              </div>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>Envoyer le Lien d'Installation par WhatsApp</span>
            </button>

            <div className="p-2.5 bg-white border border-emerald-200/80 rounded-xl text-[11px] text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">
                📲 Comment équiper vos caissiers par WhatsApp :
              </p>
              <p>• Cliquez sur le bouton vert ci-dessus pour envoyer l'accès à votre caissier.</p>
              <p>• Le caissier ouvre le lien sur son smartphone, puis clique sur <strong>"Installer"</strong>.</p>
              <p>• L'icône officielle Vision Tech s'installe directement sur son téléphone avec la boutique en direct et synchronisée au Cloud !</p>
            </div>
          </div>

          {/* Method 3: Share URL to Caissiers via WhatsApp */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                Adresse Web de votre Boutique en ligne
              </span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-[11px]"
              >
                {copiedUrl ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Adresse copiée !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier l'adresse</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2 bg-white border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 break-all select-all">
              {currentUrl}
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>Envoyer le lien par WhatsApp à un Caissier</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Synchronisation Cloud Firestore Automatique</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
