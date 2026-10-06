import React, { useState } from 'react';
import {
  X,
  Users,
  Building2,
  Shield,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Lock,
  PlusCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { AppUser } from '../types';

export const SwitchAccountModal: React.FC = () => {
  const {
    isSwitchAccountOpen,
    closeSwitchAccountModal,
    activeAppUser,
    appUsers,
    switchAccountFast,
    loginAppUser,
    logoutAppUser,
    setActiveTab,
  } = useStock();

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isSwitchAccountOpen) return null;

  const isAdmin = activeAppUser?.role === 'ADMIN';

  const handleSelectAccount = (user: AppUser) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // If already current user
    if (activeAppUser?.id === user.id) {
      return;
    }

    // If current logged-in user is ADMIN, they can immediately switch to any CASHIER without retyping password
    if (isAdmin && user.role === 'CASHIER') {
      const res = switchAccountFast(user.id);
      if (res.success) {
        setSuccessMsg(`Session basculée avec succès sur "${user.fullName}" (${user.storeName || 'Caisse'}) !`);
        setTimeout(() => {
          closeSwitchAccountModal();
          setSuccessMsg(null);
        }, 800);
      }
      return;
    }

    // Otherwise, prompt for password
    setSelectedUser(user);
    setPasswordInput('');
  };

  const handleConfirmPasswordSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);

    const res = loginAppUser(selectedUser.username, passwordInput);
    if (!res.success) {
      setErrorMsg(res.message || 'Mot de passe incorrect pour ce compte.');
      return;
    }

    setSuccessMsg(`Connexion réussie sur "${selectedUser.fullName}" !`);
    setTimeout(() => {
      setSelectedUser(null);
      setPasswordInput('');
      closeSwitchAccountModal();
      setSuccessMsg(null);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Changer de compte / Sélectionner une caisse
              </h2>
              <p className="text-xs text-slate-500">
                Basculez facilement entre vos différentes boutiques et caisses.
              </p>
            </div>
          </div>
          <button
            onClick={closeSwitchAccountModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Banner */}
        <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Connecté actuellement :</span>
            <span className="font-bold text-blue-900">
              {activeAppUser?.fullName} (@{activeAppUser?.username})
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
              <Building2 className="w-3 h-3" />
              {activeAppUser?.storeName || 'Boutique Principale'}
            </span>
          </div>
          {isAdmin && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Mode Gérant (Bascule rapide)
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Password Prompt Subform if required */}
          {selectedUser && (
            <form
              onSubmit={handleConfirmPasswordSwitch}
              className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">
                  Mot de passe requis pour @{selectedUser.username} ({selectedUser.fullName})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Annuler
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  placeholder="Entrez le mot de passe du compte..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-xs"
                >
                  Confirmer et ouvrir la session
                </button>
              </div>
            </form>
          )}

          {/* List of Accounts */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Comptes & Caisses Disponibles ({appUsers.length})
            </span>

            {appUsers.map((user) => {
              const isActive = activeAppUser?.id === user.id;

              return (
                <div
                  key={user.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        user.role === 'ADMIN'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {user.role === 'ADMIN' ? (
                        <Shield className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {user.fullName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          @{user.username}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            user.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.role === 'ADMIN' ? 'Gérant' : 'Caisse'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-600">
                          {user.storeName || 'Boutique VisionTech'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Actif</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectAccount(user)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-2xs ${
                          isAdmin && user.role === 'CASHIER'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <span>
                          {isAdmin && user.role === 'CASHIER' ? 'Inspecter' : 'Basculer'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeSwitchAccountModal();
                setActiveTab('settings');
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Gérer les boutiques / caisses</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeSwitchAccountModal();
                logoutAppUser();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
              title="Retourner à l'écran de verrouillage avec mot de passe"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion complète</span>
            </button>

            <button
              type="button"
              onClick={closeSwitchAccountModal}
              className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
