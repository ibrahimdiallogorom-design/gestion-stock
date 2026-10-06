import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  DownloadCloud,
  UploadCloud,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import { useStock } from '../context/StockContext';

export const SheetsSyncView: React.FC = () => {
  const {
    currentUser,
    hasGoogleToken,
    isLoggingIn,
    loginWithGoogle,
    logoutGoogle,
    sheetsSync,
    setSpreadsheetId,
    syncToSheetsAction,
    importFromSheetsAction,
    createSheetsAction,
    toggleAutoSync,
    products,
    movements,
  } = useStock();

  const [inputUrl, setInputUrl] = useState(sheetsSync.spreadsheetId || '');
  const [newTitle, setNewTitle] = useState('StockFlow - Inventaire & Mouvements');
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  const handleCreateNewSheet = async () => {
    try {
      setLocalFeedback('Création de la feuille Google Sheets et configuration des onglets...');
      const url = await createSheetsAction(newTitle);
      setCreatedUrl(url);
      setLocalFeedback('Feuille Google Sheets créée avec succès et initialisée avec vos stocks !');
    } catch (err: any) {
      setLocalFeedback(null);
    }
  };

  const handleConnectExisting = () => {
    if (!inputUrl.trim()) return;
    setSpreadsheetId(inputUrl);
    setLocalFeedback('Feuille de calcul connectée avec succès.');
  };

  const currentSheetLink = sheetsSync.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetsSync.spreadsheetId}/edit`
    : null;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          <span>Synchronisation Google Sheets</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Connectez votre inventaire en temps réel à Google Sheets avec mise à jour automatique des articles et du journal des mouvements.
        </p>
      </div>

      {/* Step 1: Authentication Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                hasGoogleToken ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {hasGoogleToken ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {hasGoogleToken ? 'Compte Google Connecté' : 'Authentification Google Workspace'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {hasGoogleToken
                  ? `Session active sous l'adresse ${currentUser?.email || 'votre compte Google'}.`
                  : 'Connectez votre compte Google pour permettre la lecture et l’écriture dans vos feuilles de calcul.'}
              </p>
            </div>
          </div>

          <div>
            {!hasGoogleToken ? (
              /* Official Style Google Sign In Button */
              <button
                onClick={loginWithGoogle}
                disabled={isLoggingIn}
                className="flex items-center gap-3 px-4 py-2 bg-white text-slate-700 font-medium text-xs rounded-lg border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Prêt pour la synchronisation
                </span>
                <button
                  onClick={logoutGoogle}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Spreadsheet Connection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A: Create New Spreadsheet */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              1. Créer une nouvelle feuille Google Sheets
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Génère automatiquement une feuille formatée avec deux onglets dédiés : <strong>Produits</strong> (catalogue) et <strong>Mouvements</strong> (historique).
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Titre du document Google Sheets
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nom du classeur..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <button
            onClick={handleCreateNewSheet}
            disabled={!hasGoogleToken || sheetsSync.status === 'syncing'}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Créer et initialiser la feuille</span>
          </button>
        </div>

        {/* Option B: Link Existing Spreadsheet */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              2. Lier une feuille Google Sheets existante
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Collez le lien URL complet ou l'identifiant (ID) de votre feuille Google Sheets existante.
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                URL ou ID de la feuille
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-[11px]"
              />
            </div>
          </div>

          <button
            onClick={handleConnectExisting}
            disabled={!inputUrl.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors disabled:opacity-40"
          >
            <span>Associer cette feuille</span>
          </button>
        </div>
      </div>

      {/* Active Sync Dashboard Panel */}
      {sheetsSync.spreadsheetId && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Feuille de calcul connectée
                </h3>
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                ID : {sheetsSync.spreadsheetId}
              </div>
            </div>

            {currentSheetLink && (
              <a
                href={currentSheetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200/50 w-fit"
              >
                <span>Ouvrir dans Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Sync Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={syncToSheetsAction}
              disabled={!hasGoogleToken || sheetsSync.status === 'syncing'}
              className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-40"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Envoyer les données vers Sheets (Push)</span>
            </button>

            <button
              onClick={importFromSheetsAction}
              disabled={!hasGoogleToken || sheetsSync.status === 'syncing'}
              className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors disabled:opacity-40"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Importer les données depuis Sheets (Pull)</span>
            </button>
          </div>

          {/* Auto-Sync Toggle & Status */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sheetsSync.autoSync}
                onChange={toggleAutoSync}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800">
                Synchronisation automatique après chaque mouvement ou ajout d'article
              </span>
            </label>

            <div className="text-slate-400 font-mono tabular-nums">
              Dernière synchro :{' '}
              {sheetsSync.lastSyncedAt
                ? new Date(sheetsSync.lastSyncedAt).toLocaleString('fr-FR')
                : 'Jamais'}
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {sheetsSync.errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erreur de synchronisation</p>
            <p className="mt-0.5">{sheetsSync.errorMessage}</p>
          </div>
        </div>
      )}

      {localFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="font-medium">{localFeedback}</p>
        </div>
      )}

      {/* Schema Structure Explanation */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          Structure Standard des Deux Onglets Google Sheets
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 mt-3">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">
              Onglet 1 : « Produits »
            </span>
            <p className="text-[11px] text-slate-500">
              Colonnes : ID, SKU, Nom Article, Catégorie, Quantité en Stock, Seuil Minimum, Prix Achat HT, Prix Vente TTC, Fournisseur, Emplacement, Dernière MàJ.
            </p>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">
              Onglet 2 : « Mouvements »
            </span>
            <p className="text-[11px] text-slate-500">
              Colonnes : ID Mouvement, Date & Heure, SKU, Nom Produit, Type, Variation (+/-), Stock Précédent, Nouveau Stock, Motif, Opérateur, Notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
