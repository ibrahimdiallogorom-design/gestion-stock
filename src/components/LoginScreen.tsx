import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Store,
  Cloud,
} from 'lucide-react';
import { useStock } from '../context/StockContext';

export const LoginScreen: React.FC = () => {
  const { loginAppUser, appUsers, cloudStatus, cloudStatusMessage } = useStock();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Veuillez renseigner votre nom d’utilisateur et votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    const result = loginAppUser(username, password);
    if (!result.success) {
      setErrorMsg(result.message || 'Identifiants incorrects.');
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand & Security Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 mb-1">
            <Boxes className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Boutique VisionTech
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Plateforme sécurisée de gestion de stock, encaissement & comptabilité.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Accès Protégé</span>
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
              cloudStatus === 'connected'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : cloudStatus === 'connecting'
                ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 animate-pulse'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
            }`}>
              <Cloud className="w-3.5 h-3.5" />
              <span>{cloudStatus === 'connected' ? 'Cloud Synchro Partout' : cloudStatusMessage}</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
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
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                autoFocus
                placeholder="Ex: admin ou caissier"
                className="w-full pl-10 pr-3 py-3 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Entrez votre mot de passe"
                className="w-full pl-10 pr-10 py-3 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
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
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>{isSubmitting ? 'Connexion en cours...' : 'Ouvrir la Boutique'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Credentials Helper (Touch buttons for fast connection) */}
        <div className="pt-2 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">
              Comptes configurés sur cette boutique ({appUsers.length}) :
            </span>
            <span className="text-[10px] text-slate-500">
              Toucher pour pré-remplir
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-0.5">
            {appUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleQuickSelect(user.username, user.password)}
                className="p-2.5 bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-500/50 border border-slate-700/80 rounded-xl text-left transition-all group"
                title={`Se connecter en tant que ${user.fullName} (@${user.username})`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-white text-xs truncate">
                    {user.role === 'ADMIN' ? '👑 Gérant' : '🛒 Caisse'}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                    {user.role === 'ADMIN' ? 'Admin' : 'Caisse'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 font-mono font-semibold truncate mt-1">
                  @{user.username}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {user.fullName || user.storeName}
                </div>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 text-center pt-1 leading-relaxed">
            ☁️ <strong>Synchronisation Cloud :</strong> Les comptes configurés sur un téléphone sont reconnus et utilisables sur tous vos téléphones et ordinateurs.
          </p>
        </div>
      </div>
    </div>
  );
};
