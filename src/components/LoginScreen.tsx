import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Cloud,
  RefreshCw,
  Building2,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import {
  getActiveTenantId,
  setActiveTenantId,
  generateSaaSTenantId,
} from '../services/cloudSync';

const LOCKOUT_STORAGE_KEY = 'stockflow_login_lockout_until_v1';
const FAILED_ATTEMPTS_KEY = 'stockflow_login_failed_count_v1';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 secondes de blocage anti-scan / brute-force

export const LoginScreen: React.FC = () => {
  const { loginAppUser, appUsers, cloudStatus } = useStock();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Protection Anti-Brute-Force & Anti-Scan
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(localStorage.getItem(FAILED_ATTEMPTS_KEY) || 0);
  });
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    return Number(localStorage.getItem(LOCKOUT_STORAGE_KEY) || 0);
  });
  const [remainingLockSeconds, setRemainingLockSeconds] = useState<number>(0);

  // Mode SaaS Multi-Boutiques / Code Espace Entreprise
  const [showSaaSPanel, setShowSaaSPanel] = useState(false);
  const [tenantIdInput, setTenantIdInput] = useState<string>(() => getActiveTenantId());
  const [newCompanyName, setNewCompanyName] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        setRemainingLockSeconds(Math.ceil((lockoutUntil - now) / 1000));
      } else {
        setRemainingLockSeconds(0);
        if (lockoutUntil > 0) {
          setLockoutUntil(0);
          setFailedAttempts(0);
          localStorage.removeItem(LOCKOUT_STORAGE_KEY);
          localStorage.removeItem(FAILED_ATTEMPTS_KEY);
        }
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = remainingLockSeconds > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isLockedOut) {
      setErrorMsg(
        `Sécurité anti-intrusion active : trop de tentatives. Réessayez dans ${remainingLockSeconds}s.`
      );
      return;
    }

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Veuillez renseigner votre nom d’utilisateur et votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    const result = loginAppUser(username, password);
    if (!result.success) {
      const nextCount = failedAttempts + 1;
      setFailedAttempts(nextCount);
      localStorage.setItem(FAILED_ATTEMPTS_KEY, String(nextCount));

      if (nextCount >= MAX_LOGIN_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        localStorage.setItem(LOCKOUT_STORAGE_KEY, String(until));
        setErrorMsg(
          `Alerte Sécurité : 5 tentatives échouées. Accès bloqué pendant 60 secondes contre le piratage.`
        );
      } else {
        setErrorMsg(
          `${result.message || 'Identifiants incorrects.'} (${MAX_LOGIN_ATTEMPTS - nextCount} essai(s) restant(s))`
        );
      }
      setIsSubmitting(false);
    } else {
      setFailedAttempts(0);
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    }
  };

  // Sélection rapide SÉCURISÉE : pré-remplit UNIQUEMENT l'identifiant, exige toujours la saisie du mot de passe !
  const handleQuickSelectUsernameOnly = (selectedUsername: string) => {
    setUsername(selectedUsername);
    setPassword('');
    setErrorMsg(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleApplyTenantId = (targetTenant: string) => {
    const applied = setActiveTenantId(targetTenant);
    setTenantIdInput(applied);
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border border-emerald-500/30 shadow-xl shadow-emerald-500/10 mb-1 p-1.5 overflow-hidden">
            <img src="./icon.png" alt="Logo Vision Tech" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Boutique VisionTech
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Plateforme SaaS sécurisée de gestion de stock, grossiste & caisses.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Protection Anti-Scan Active</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{cloudStatus === 'connected' ? 'Cloud Connecté' : 'Mode Hors-Ligne (100% Autonome)'}</span>
            </div>
          </div>
        </div>

        {/* Error / Lockout Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLockedOut && (
          <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs text-center font-bold">
            🔒 Verrouillage de sécurité anti-brute-force : {remainingLockSeconds} seconde(s) restante(s)
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              Nom d’utilisateur / Identifiant
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled={isLockedOut}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                autoFocus
                autoComplete="username"
                placeholder="Saisissez votre identifiant..."
                className="w-full pl-10 pr-3 py-3 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              Mot de passe secret *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                disabled={isLockedOut}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                autoComplete="current-password"
                placeholder="Entrez votre mot de passe obligatoire"
                className="w-full pl-10 pr-10 py-3 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLockedOut}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>
              {isLockedOut
                ? `Verrouillé (${remainingLockSeconds}s)`
                : isSubmitting
                ? 'Vérification...'
                : 'Se Connecter avec Mot de Passe'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Secure Username Selector (Fills ONLY username, never password) */}
        <div className="pt-2 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">
              Choisir un profil (mot de passe requis) :
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              <span>Sécurisé</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-0.5">
            {appUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleQuickSelectUsernameOnly(user.username)}
                className={`p-2.5 border rounded-xl text-left transition-all group ${
                  username === user.username
                    ? 'bg-emerald-950/60 border-emerald-500/70'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-white text-xs truncate">
                    {user.role === 'ADMIN' ? '👑 Gérant' : '🛒 Caisse'}
                  </span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[11px] text-emerald-400 font-mono font-semibold truncate mt-1">
                  @{user.username}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {user.storeName || user.fullName}
                </div>
              </button>
            ))}
          </div>

          {/* SaaS Multi-Tenant Workspace Isolation Panel */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowSaaSPanel((v) => !v)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 text-[11px] text-slate-300 font-semibold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Espace SaaS : <strong className="font-mono text-white">{getActiveTenantId()}</strong></span>
              </span>
              <span className="text-[10px] text-blue-400 underline">
                {showSaaSPanel ? 'Fermer' : 'Changer / Créer un espace SaaS'}
              </span>
            </button>

            {showSaaSPanel && (
              <div className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-slate-700 space-y-3 text-xs">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  🛡️ <strong>Isolation Multi-Boutiques SaaS :</strong> Chaque entreprise dispose d'un code d'espace privé non-énumérable pour empêcher tout scan des données entre clients.
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Rejoindre un code d'espace existant :
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tenantIdInput}
                      onChange={(e) => setTenantIdInput(e.target.value)}
                      placeholder="Ex: visiontech-main"
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyTenantId(tenantIdInput)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                    >
                      Ouvrir
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <label className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Générer un nouvel espace SaaS protégé (anti-scan) :</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Nom de la nouvelle entreprise..."
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateSaaSTenantId(newCompanyName || 'boutique');
                        handleApplyTenantId(generated);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs whitespace-nowrap"
                    >
                      Créer Espace
                    </button>
                  </div>
                </div>

                {getActiveTenantId() !== 'visiontech-main' && (
                  <button
                    type="button"
                    onClick={() => handleApplyTenantId('visiontech-main')}
                    className="w-full py-1.5 text-[11px] text-amber-400 hover:underline text-center"
                  >
                    Revenir à la boutique principale (visiontech-main)
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-1 flex justify-center">
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
                } catch (e) {}
                window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
              }}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span>Forcer la mise à jour / Vider le cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
