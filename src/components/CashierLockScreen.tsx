import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, Eye, EyeOff, UserCheck } from 'lucide-react';
import { useStock } from '../context/StockContext';

export const CashierLockScreen: React.FC = () => {
  const { unlockCashier, cashierName } = useStock();
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleKeyPress = (num: string) => {
    setErrorMsg(null);
    if (pinInput.length < 12) {
      setPinInput((prev) => prev + num);
    }
  };

  const handleClear = () => {
    setErrorMsg(null);
    setPinInput('');
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleAttemptUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput) {
      setErrorMsg('Veuillez saisir votre mot de passe ou code PIN.');
      return;
    }

    const success = unlockCashier(pinInput);
    if (success) {
      setIsSuccess(true);
      setErrorMsg(null);
    } else {
      setErrorMsg('Mot de passe ou code PIN incorrect. Accès refusé.');
      setPinInput('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        {/* Security Badge & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 shadow-xs mb-1">
            {isSuccess ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 animate-bounce" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Terminal de Caisse Sécurisé
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Accès protégé par mot de passe. Seul le caissier autorisé peut ouvrir la caisse et enregistrer des encaissements.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-slate-700 text-xs font-medium mt-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Poste assigné : <strong>{cashierName}</strong></span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAttemptUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 text-center">
              Mot de passe ou Code PIN du Caissier
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => {
                  setErrorMsg(null);
                  setPinInput(e.target.value);
                }}
                autoFocus
                placeholder="Entrez votre mot de passe ou PIN..."
                className={`w-full text-center text-lg tracking-widest font-mono py-2.5 px-10 rounded-xl border transition-all ${
                  errorMsg
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPin ? 'Masquer le code' : 'Afficher le code'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Keypad for Touch & Quick Mouse Input */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleKeyPress(n.toString())}
                className="h-12 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 border border-slate-200 rounded-xl font-mono text-base font-semibold text-slate-800 transition-colors shadow-2xs"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-12 bg-slate-50 hover:bg-slate-100 active:bg-blue-50 border border-slate-200 rounded-xl font-mono text-base font-semibold text-slate-800 transition-colors shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
            >
              ⌫ Retour
            </button>
          </div>

          {/* Action Unlock Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-xs shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>Déverrouiller le Poste de Caisse</span>
          </button>
        </form>

        {/* Security Help / Default code hint */}
        <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span>Code initial par défaut : </span>
          <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">1234</span>
          <span className="block mt-1">
            Modifiable à tout moment dans le menu <strong>Paramètres</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
