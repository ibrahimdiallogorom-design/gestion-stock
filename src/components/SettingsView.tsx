import React, { useState } from 'react';
import {
  Settings,
  Store,
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Palette,
  FileSpreadsheet,
  Lock,
  KeyRound,
  UserCheck,
  ShieldAlert,
  ShoppingCart,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { THEME_CONFIGS } from './ThemeClasses';
import { ThemeStyle, UserRole } from '../types';

export const SettingsView: React.FC = () => {
  const {
    products,
    movements,
    resetToDefaultData,
    openConfirmModal,
    theme,
    setTheme,
    density,
    setDensity,
    sheetsSync,
    toggleAutoSync,
    setActiveTab,
    isCashierUnlocked,
    cashierName,
    setCashierName,
    changeCashierPin,
    lockCashier,
    appUsers,
    activeAppUser,
    updateAppUser,
    createAppUser,
    deleteAppUser,
  } = useStock();

  const [storeName, setStoreName] = useState('Boutique VisionTech');
  const [currency, setCurrency] = useState('FCFA (Franc CFA)');
  const [defaultThreshold, setDefaultThreshold] = useState(5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Cashier PIN form states
  const [cashierNameInput, setCashierNameInput] = useState(cashierName);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);

  // User accounts management states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('CASHIER');
  const [editStoreName, setEditStoreName] = useState('');

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('CASHIER');
  const [newStoreName, setNewStoreName] = useState('');

  const [userMsg, setUserMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const startEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditFullName(user.fullName);
    setEditPassword(user.password);
    setEditRole(user.role);
    setEditStoreName(user.storeName || storeName || 'Boutique VisionTech Centrale');
    setUserMsg(null);
  };

  const saveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    if (!editUsername.trim() || !editPassword.trim()) {
      setUserMsg({ text: 'Le nom d’utilisateur et le mot de passe sont obligatoires.', isError: true });
      return;
    }
    const res = updateAppUser(editingUserId, {
      username: editUsername.trim(),
      fullName: editFullName.trim() || editUsername.trim(),
      password: editPassword.trim(),
      role: editRole,
      storeName: editStoreName.trim() || storeName || 'Boutique VisionTech Centrale',
    });
    if (!res.success) {
      setUserMsg({ text: res.message || 'Erreur lors de la mise à jour.', isError: true });
    } else {
      setUserMsg({ text: 'Compte utilisateur et identifiant mis à jour avec succès !' });
      setEditingUserId(null);
      setTimeout(() => setUserMsg(null), 3500);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setUserMsg({ text: 'Veuillez renseigner le nom d’utilisateur et le mot de passe.', isError: true });
      return;
    }
    const res = createAppUser({
      username: newUsername.trim(),
      fullName: newFullName.trim() || newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      storeName: newStoreName.trim() || storeName || 'Boutique VisionTech Centrale',
    });
    if (!res.success) {
      setUserMsg({ text: res.message || 'Erreur lors de la création.', isError: true });
    } else {
      setUserMsg({ text: 'Nouveau compte créé avec succès !' });
      setIsAddingUser(false);
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      setNewStoreName('');
      setTimeout(() => setUserMsg(null), 3500);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleUpdateCashierSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setPinErrorMsg(null);
    setPinSuccessMsg(null);

    if (cashierNameInput.trim() && cashierNameInput.trim() !== cashierName) {
      setCashierName(cashierNameInput.trim());
    }

    if (newPinInput || oldPinInput || confirmPinInput) {
      if (!oldPinInput) {
        setPinErrorMsg("Veuillez saisir l'ancien mot de passe / code PIN.");
        return;
      }
      if (newPinInput !== confirmPinInput) {
        setPinErrorMsg('Le nouveau code et sa confirmation ne correspondent pas.');
        return;
      }
      if (newPinInput.length < 4) {
        setPinErrorMsg('Le nouveau code doit comporter au moins 4 chiffres ou caractères.');
        return;
      }

      const res = changeCashierPin(oldPinInput, newPinInput);
      if (!res.success) {
        setPinErrorMsg(res.message);
        return;
      }

      setOldPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinSuccessMsg('Mot de passe de la caisse mis à jour avec succès !');
      setTimeout(() => setPinSuccessMsg(null), 4000);
    } else {
      setPinSuccessMsg('Identité du caissier mise à jour.');
      setTimeout(() => setPinSuccessMsg(null), 3000);
    }
  };

  const exportFullBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storeName,
      products,
      movements,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stockflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetData = () => {
    openConfirmModal(
      'Réinitialiser les données de démonstration ?',
      'Cette action va réinitialiser le catalogue de stock et le grand livre des mouvements avec les données de départ. Vos modifications locales non exportées seront écrasées.',
      () => resetToDefaultData(),
      true,
      'Réinitialiser tout'
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-600" />
          <span>Paramètres de l'Application</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configurez les paramètres généraux de votre boutique, vos préférences d'affichage et gérez vos sauvegardes de données.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">Paramètres enregistrés avec succès.</span>
        </div>
      )}

      {/* 1. General Store Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Store className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Identité du Point de Vente & Stock
          </h2>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nom de la boutique / Enseigne
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Devise monétaire principale
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-semibold"
              >
                <option value="FCFA (Franc CFA)">Franc CFA (FCFA / XOF)</option>
                <option value="EUR (€)">Euro (€)</option>
                <option value="USD ($)">Dollar US ($)</option>
                <option value="GNF">Franc Guinéen (GNF)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Seuil d'alerte critique par défaut
              </label>
              <input
                type="number"
                min="1"
                value={defaultThreshold}
                onChange={(e) => setDefaultThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Appliqué automatiquement lors de la création d'un article.
              </span>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsSync.autoSync}
                  onChange={toggleAutoSync}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-700">
                  Synchroniser automatiquement vers Google Sheets à chaque mouvement
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs shadow-blue-600/20 transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      {/* 2. User Accounts & Multi-Store Login Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Comptes Utilisateurs & Connexion Boutique
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddingUser(!isAddingUser);
              setEditingUserId(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isAddingUser ? 'Fermer' : 'Nouveau Compte'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Gérez ici les identifiants et mots de passe. Vous pouvez modifier le nom d'utilisateur d'un compte (ex: renommer la caisse pour une boutique d'encaissement spécifique), changer les mots de passe et créer des accès pour vos collaborateurs.
        </p>

        {userMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              userMsg.isError
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}
          >
            {userMsg.isError ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{userMsg.text}</span>
          </div>
        )}

        {/* Add User Form */}
        {isAddingUser && (
          <form
            onSubmit={handleCreateUser}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
          >
            <span className="font-bold text-slate-800 block text-sm">
              Créer un Nouveau Compte d'Accès
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nom d’utilisateur / Identifiant de connexion *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Ex: caisse2 ou ibrahim"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nom complet / Poste assigné
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Caisse Encaissement 02"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mot de passe de connexion *
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Rôle & Niveau d'accès
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                >
                  <option value="CASHIER">Caissier (Poste Caisse & Encaissement)</option>
                  <option value="ADMIN">Administrateur (Accès Total & Gestion)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Boutique / Point de Vente assigné
                </label>
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="Ex: Boutique VisionTech Centrale, Boutique Ouagadougou, Boutique Gorom-Gorom..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-xs"
              >
                Créer l'utilisateur
              </button>
            </div>
          </form>
        )}

        {/* Existing Users List */}
        <div className="space-y-2.5">
          {appUsers.map((user) => {
            const isEditing = editingUserId === user.id;

            return (
              <div
                key={user.id}
                className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3"
              >
                {!isEditing ? (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          user.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {user.role === 'ADMIN' ? '👑' : '🛒'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {user.fullName}
                          </span>
                          <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            @{user.username}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              user.role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {user.role === 'ADMIN' ? 'Gérant' : 'Poste Caisse'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-semibold text-slate-700">🏪 {user.storeName || storeName || 'Boutique VisionTech Centrale'}</span>
                          <span className="text-slate-300">•</span>
                          <span>Mot de passe : <strong className="font-mono text-slate-600">{user.password}</strong></span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditUser(user)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors"
                        title="Modifier le nom d'utilisateur ou le mot de passe"
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        <span>Modifier</span>
                      </button>

                      {appUsers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteAppUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                          title="Supprimer ce compte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Edit Form */
                  <form onSubmit={saveEditUser} className="space-y-3 text-xs pt-1">
                    <span className="font-bold text-slate-800 block text-xs">
                      Modifier les identifiants de ce compte
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Nom d’utilisateur / Identifiant *
                        </label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Nom affiché / Libellé
                        </label>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Nouveau mot de passe *
                        </label>
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Rôle
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                        >
                          <option value="CASHIER">Caissier (Poste Caisse & Encaissement)</option>
                          <option value="ADMIN">Administrateur (Accès Total & Gestion)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-semibold text-slate-700 block mb-1">
                          Boutique / Point de Vente assigné
                        </label>
                        <input
                          type="text"
                          value={editStoreName}
                          onChange={(e) => setEditStoreName(e.target.value)}
                          placeholder="Ex: Boutique VisionTech Centrale, Boutique Ouagadougou, etc."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingUserId(null)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-xs"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Cashier Terminal Security & Password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Sécurité de la Caisse & Mot de Passe Caissier
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                isCashierUnlocked
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCashierUnlocked ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {isCashierUnlocked ? 'Caisse Ouverte' : 'Caisse Verrouillée'}
            </span>

            {isCashierUnlocked && (
              <button
                type="button"
                onClick={lockCashier}
                className="px-2.5 py-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 font-medium transition-colors"
              >
                Verrouiller
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Protégez l'accès au terminal d'encaissement et à la validation des ventes. Seul le caissier autorisé possédant le code secret peut se connecter et manipuler la caisse.
        </p>

        {pinSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pinSuccessMsg}</span>
          </div>
        )}

        {pinErrorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{pinErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCashierSecurity} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nom ou Référence du Caissier Autorisé
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cashierNameInput}
                  onChange={(e) => setCashierNameInput(e.target.value)}
                  placeholder="Ex: Caissier Principal ou Moussa D."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Ancien Mot de passe / Code PIN actuel
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(e.target.value)}
                  placeholder="Code actuel (par défaut : 1234)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nouveau Mot de passe / Nouveau Code PIN
              </label>
              <input
                type="password"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="Ex: 5821 ou mot de passe"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Minimum 4 caractères ou chiffres pour le terminal de caisse.
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Confirmer le nouveau code
              </label>
              <input
                type="password"
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value)}
                placeholder="Retapez le nouveau code"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('caisse')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Tester le terminal de caisse &rarr;</span>
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs shadow-blue-600/20 transition-colors"
            >
              Mettre à jour le code de la caisse
            </button>
          </div>
        </form>
      </div>

      {/* 3. Visual & Display Preferences */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Style Graphique & Densité d'Affichage
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('design_system')}
            className="text-xs text-blue-600 hover:underline"
          >
            Voir la planche design complète
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-2">
              Univers Thématique Actif
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(THEME_CONFIGS) as ThemeStyle[]).map((key) => {
                const cfg = THEME_CONFIGS[key];
                const isSelected = theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.accentColor }}
                      />
                      <span className="font-bold truncate">{cfg.name.split(' ')[0]}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {cfg.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-2">
              Densité du Tableau de Stock
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-3 py-1.5 rounded-lg border font-medium ${
                  density === 'compact'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Compact (36px - Écrans de gestionnaire)
              </button>
              <button
                type="button"
                onClick={() => setDensity('normal')}
                className={`px-3 py-1.5 rounded-lg border font-medium ${
                  density === 'normal'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Normal (44px - Consultation standard)
              </button>
              <button
                type="button"
                onClick={() => setDensity('touch')}
                className={`px-3 py-1.5 rounded-lg border font-medium ${
                  density === 'touch'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tactile (56px - Caisse et tablettes)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Data Management & Backups */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Database className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            Gestion & Sauvegarde des Données Locales
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <span className="font-bold text-slate-800 block">Sauvegarde Complète (JSON)</span>
            <p className="text-slate-500 text-[11px]">
              Téléchargez un instantané complet contenant vos {products.length} articles et {movements.length} mouvements enregistrés.
            </p>
            <button
              onClick={exportFullBackup}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-800 font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Télécharger le fichier JSON</span>
            </button>
          </div>

          {/* Reset Demo Data */}
          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-3">
            <span className="font-bold text-rose-800 block">Données de Démonstration</span>
            <p className="text-rose-700/80 text-[11px]">
              Réinitialisez votre inventaire et vos flux vers le jeu d'essai standardisé du commerce de détail.
            </p>
            <button
              onClick={handleResetData}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-rose-700 font-semibold rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Réinitialiser aux valeurs d'exemple</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
