import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MessageCircle,
  ShoppingBag,
  HelpCircle,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Tag,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { NonPurchaseReason, NON_PURCHASE_REASON_LABELS } from '../types';

export const SurveyModal: React.FC = () => {
  const {
    surveyModal,
    closeSurveyModal,
    addVisitorSurvey,
    updateVisitorSurvey,
    products,
    activeAppUser,
    isLargeTextMode,
  } = useStock();

  const [visitorName, setVisitorName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [requestedProduct, setRequestedProduct] = useState('');
  const [requestedCategory, setRequestedCategory] = useState('');
  const [budgetProposed, setBudgetProposed] = useState('');
  const [actualPrice, setActualPrice] = useState('');
  const [reason, setReason] = useState<NonPurchaseReason>('PRICE_TOO_HIGH');
  const [reasonDetails, setReasonDetails] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialisation lors de l'ouverture
  useEffect(() => {
    if (surveyModal.isOpen) {
      if (surveyModal.survey) {
        const s = surveyModal.survey;
        setVisitorName(s.visitorName || '');
        setWhatsappNumber(s.whatsappNumber || '');
        setRequestedProduct(s.requestedProduct || '');
        setRequestedCategory(s.requestedCategory || '');
        setBudgetProposed(s.budgetProposed ? String(s.budgetProposed) : '');
        setActualPrice(s.actualPrice ? String(s.actualPrice) : '');
        setReason(s.reason || 'PRICE_TOO_HIGH');
        setReasonDetails(s.reasonDetails || '');
        setDate(s.date || new Date().toISOString().split('T')[0]);
      } else {
        setVisitorName('');
        setWhatsappNumber('');
        setRequestedProduct(surveyModal.defaultProduct || '');
        setRequestedCategory('');
        setBudgetProposed('');
        setActualPrice('');
        setReason('PRICE_TOO_HIGH');
        setReasonDetails('');
        setDate(new Date().toISOString().split('T')[0]);
      }
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [surveyModal.isOpen, surveyModal.survey, surveyModal.defaultProduct]);

  if (!surveyModal.isOpen) return null;

  // Auto-fill price and category if user picks an existing product
  const handleProductSelect = (productName: string) => {
    setRequestedProduct(productName);
    const matched = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
    if (matched) {
      setRequestedCategory(matched.category || '');
      setActualPrice(String(matched.salePrice || 0));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedProduct.trim()) {
      setErrorMessage("Veuillez renseigner le produit ou l'article demandé par le visiteur.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (surveyModal.survey) {
        // Mode modification
        await updateVisitorSurvey(surveyModal.survey.id, {
          date,
          visitorName: visitorName.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          requestedProduct: requestedProduct.trim(),
          requestedCategory: requestedCategory.trim() || undefined,
          budgetProposed: budgetProposed ? Number(budgetProposed) : undefined,
          actualPrice: actualPrice ? Number(actualPrice) : undefined,
          reason,
          reasonDetails: reasonDetails.trim() || undefined,
        });
        setSuccessMessage('Visite mise à jour avec succès !');
        setTimeout(() => closeSurveyModal(), 700);
      } else {
        // Nouvelle visite
        const res = await addVisitorSurvey({
          date,
          visitorName: visitorName.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          requestedProduct: requestedProduct.trim(),
          requestedCategory: requestedCategory.trim() || undefined,
          budgetProposed: budgetProposed ? Number(budgetProposed) : undefined,
          actualPrice: actualPrice ? Number(actualPrice) : undefined,
          reason,
          reasonDetails: reasonDetails.trim() || undefined,
          recordedBy: activeAppUser?.fullName || activeAppUser?.username || 'Vendeur',
          storeName: activeAppUser?.storeName || 'Boutique Moussa Vision',
          contactedForPromo: false,
        });
        setSuccessMessage(res.message);
        setTimeout(() => closeSurveyModal(), 700);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonKeys: NonPurchaseReason[] = [
    'PRICE_TOO_HIGH',
    'QUALITY_CONCERN',
    'OUT_OF_STOCK',
    'JUST_LOOKING',
    'PAYMENT_METHOD',
    'OTHER',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className={`font-black ${isLargeTextMode ? 'text-xl' : 'text-lg'}`}>
                {surveyModal.survey ? 'Modifier la Visite' : 'Enregistrer une Visite / Prospect'}
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Comptabiliser le motif de non-achat & capturer le contact
              </p>
            </div>
          </div>
          <button
            onClick={closeSurveyModal}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire défilable */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Date de la visite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date du passage <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enregistré par
              </label>
              <input
                type="text"
                disabled
                value={`${activeAppUser?.fullName || 'Vendeur'} (${activeAppUser?.storeName || 'Boutique'})`}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Produit demandé */}
          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-indigo-950 flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Article ou Demande du Visiteur <span className="text-rose-600">*</span></span>
              </label>
              <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100/70 px-2 py-0.5 rounded-full">
                Existant ou Nouveauté
              </span>
            </div>

            <input
              type="text"
              list="existing-products-list"
              value={requestedProduct}
              onChange={(e) => handleProductSelect(e.target.value)}
              placeholder="Ex: Montre Connectée Noire, Lunettes polarisées, Bazin..."
              required
              className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <datalist id="existing-products-list">
              {products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.category ? `[${p.category}] - ` : ''}{p.salePrice.toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </datalist>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Prix en Magasin (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  value={actualPrice}
                  onChange={(e) => setActualPrice(e.target.value)}
                  placeholder="Ex: 15000"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Budget Proposé / Espéré (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  value={budgetProposed}
                  onChange={(e) => setBudgetProposed(e.target.value)}
                  placeholder="Ex: 10000"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Motif du non-achat (Le point central du sondage) */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5 flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Pourquoi le visiteur n'a-t-il pas payé ? <span className="text-rose-500">*</span></span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reasonKeys.map((rk) => {
                const info = NON_PURCHASE_REASON_LABELS[rk];
                const isSelected = reason === rk;
                return (
                  <button
                    type="button"
                    key={rk}
                    onClick={() => setReason(rk)}
                    className={`flex items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-500/30 font-bold shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xl mr-2.5 shrink-0">{info.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{info.label}</span>
                        {isSelected && <span className="text-indigo-600 text-xs">✓</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5 line-clamp-1">
                        {info.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Précisions / Commentaire */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Détails & Explications du client
            </label>
            <textarea
              rows={2}
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="Ex: Trouve le prix de 15 000 FCFA trop cher, voulait la couleur bleu nuit qui n'existe plus en stock..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Coordonnées Client / Contact WhatsApp pour promotion */}
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-emerald-950 flex items-center space-x-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Contact Client & WhatsApp (pour futures promos)</span>
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                Optionnel mais Recommandé
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nom ou Prénom</span>
                </label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Ex: M. Ouédraogo, Fatou..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Numéro WhatsApp / Téléphone</span>
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Ex: 70000000 ou +226..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-emerald-800 font-medium">
              💡 Ce contact apparaîtra dans votre liste avec un bouton direct pour lui envoyer des promotions ou lui signaler le réassort de son produit sur WhatsApp.
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="pt-2 flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={closeSurveyModal}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{surveyModal.survey ? 'Mettre à jour' : 'Valider la Visite'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
