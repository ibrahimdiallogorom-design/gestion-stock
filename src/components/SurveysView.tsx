import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  MessageCircle,
  Phone,
  Calendar,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  Trash2,
  Edit,
  ExternalLink,
  ChevronDown,
  Sparkles,
  BarChart3,
  ListFilter,
  DollarSign,
  PackageX,
  Eye,
  CreditCard,
  Layers,
  ArrowUpRight,
  Share2,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { VisitorSurvey, NonPurchaseReason, NON_PURCHASE_REASON_LABELS } from '../types';

export const SurveysView: React.FC = () => {
  const {
    surveys,
    deleteVisitorSurvey,
    updateVisitorSurvey,
    openSurveyModal,
    openConfirmModal,
    products,
    activeAppUser,
    isLargeTextMode,
  } = useStock();

  const [activeSubTab, setActiveSubTab] = useState<'prospects' | 'analytics'>('prospects');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [filterHasPhone, setFilterHasPhone] = useState<boolean>(false);
  const [selectedSurveyForPromo, setSelectedSurveyForPromo] = useState<VisitorSurvey | null>(null);
  const [promoTemplate, setPromoTemplate] = useState<'promo' | 'reassort' | 'info' | 'custom'>('promo');
  const [customPromoMessage, setCustomPromoMessage] = useState('');

  // 1. Calculs KPIs & Synthèse
  const totalSurveys = surveys.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySurveys = surveys.filter((s) => s.date === todayStr).length;

  const thisMonthStr = todayStr.substring(0, 7);
  const thisMonthSurveys = surveys.filter((s) => s.date.startsWith(thisMonthStr)).length;

  const withWhatsAppCount = surveys.filter((s) => (s.whatsappNumber || '').trim().length > 3).length;

  const outOfStockSurveysCount = surveys.filter((s) => s.reason === 'OUT_OF_STOCK').length;
  const priceTooHighSurveysCount = surveys.filter((s) => s.reason === 'PRICE_TOO_HIGH').length;
  const qualityConcernSurveysCount = surveys.filter((s) => s.reason === 'QUALITY_CONCERN').length;

  // Calcul du motif dominant
  const reasonCounts: Record<NonPurchaseReason, number> = {
    PRICE_TOO_HIGH: 0,
    QUALITY_CONCERN: 0,
    OUT_OF_STOCK: 0,
    JUST_LOOKING: 0,
    PAYMENT_METHOD: 0,
    OTHER: 0,
  };
  surveys.forEach((s) => {
    if (reasonCounts[s.reason] !== undefined) {
      reasonCounts[s.reason]++;
    }
  });

  let topReasonKey: NonPurchaseReason = 'PRICE_TOO_HIGH';
  let topReasonCount = 0;
  (Object.keys(reasonCounts) as NonPurchaseReason[]).forEach((k) => {
    if (reasonCounts[k] > topReasonCount) {
      topReasonCount = reasonCounts[k];
      topReasonKey = k;
    }
  });
  const topReasonPercent = totalSurveys > 0 ? Math.round((topReasonCount / totalSurveys) * 100) : 0;

  // Top articles demandés
  const productDemandMap = useMemo(() => {
    const map = new Map<string, { count: number; reasons: Record<string, number> }>();
    surveys.forEach((s) => {
      const name = s.requestedProduct.trim();
      if (!name) return;
      const current = map.get(name) || { count: 0, reasons: {} };
      current.count++;
      current.reasons[s.reason] = (current.reasons[s.reason] || 0) + 1;
      map.set(name, current);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [surveys]);

  // Filtrage de la liste
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      // Recherche textuelle
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (s.visitorName || '').toLowerCase().includes(q) ||
        (s.whatsappNumber || '').includes(q) ||
        s.requestedProduct.toLowerCase().includes(q) ||
        (s.reasonDetails || '').toLowerCase().includes(q) ||
        (s.recordedBy || '').toLowerCase().includes(q);

      // Filtre de motif
      const matchReason = filterReason === 'all' || s.reason === filterReason;

      // Filtre téléphone
      const matchPhone = !filterHasPhone || (s.whatsappNumber || '').trim().length > 3;

      return matchSearch && matchReason && matchPhone;
    });
  }, [surveys, searchTerm, filterReason, filterHasPhone]);

  // Préparation du message WhatsApp
  const generateWhatsAppMessage = (s: VisitorSurvey, template: 'promo' | 'reassort' | 'info' | 'custom'): string => {
    const store = s.storeName || activeAppUser?.storeName || 'Boutique Moussa Vision';
    const client = s.visitorName ? `Bonjour ${s.visitorName}` : 'Bonjour';
    const prod = s.requestedProduct;

    switch (template) {
      case 'promo':
        return `${client} ! Merci pour votre passage à la ${store}. Concernant l'article *${prod}* que vous avez apprécié lors de votre visite, nous vous offrons une remise spéciale promotionnelle exclusive ! Venez en profiter en boutique ou contactez-nous directement ici. Cordialement !`;
      case 'reassort':
        return `${client} ! Excellente nouvelle de la part de la ${store} : l'article *${prod}* que vous recherchiez lors de votre dernière visite est maintenant de retour en stock ! Passez vite en magasin ou répondez à ce message pour réserver votre exemplaire avant épuisement.`;
      case 'info':
        return `${client} ! Merci pour votre visite chez ${store}. Nous restons à votre entière disposition pour tout renseignement ou commande sur *${prod}*. Au plaisir de vous revoir très bientôt !`;
      case 'custom':
        return customPromoMessage || `${client} ! Message de votre boutique ${store} concernant *${prod}*.`;
    }
  };

  const handleOpenWhatsApp = (s: VisitorSurvey) => {
    if (!s.whatsappNumber) return;
    // Nettoyer le numéro (enlever espaces, tirets, etc.)
    let cleanPhone = s.whatsappNumber.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length === 8) {
      // Indicatif par défaut Burkina Faso si 8 chiffres sans indicatif
      cleanPhone = `+226${cleanPhone}`;
    }
    const message = generateWhatsAppMessage(s, promoTemplate);
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encoded}`;

    // Mettre à jour l'état "contacté pour promo"
    updateVisitorSurvey(s.id, { contactedForPromo: true });

    window.open(waUrl, '_blank');
    setSelectedSurveyForPromo(null);
  };

  const handleDelete = (id: string, name?: string) => {
    openConfirmModal(
      'Supprimer cette fiche visite ?',
      `Êtes-vous sûr de vouloir supprimer la visite ${name ? `de "${name}"` : ''} ? Cette action est irréversible.`,
      () => deleteVisitorSurvey(id),
      true,
      'Supprimer'
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. En-tête & Bouton Nouveau Sondage */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-black tracking-wide uppercase">
              Sondage Visiteurs & CRM
            </span>
            <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{surveys.length} visites analysées</span>
            </span>
          </div>
          <h1 className={`font-black tracking-tight text-white ${isLargeTextMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
            Outil de Sondage & Visites sans Achat
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
            Comprenez pourquoi les visiteurs n'ont pas acheté (prix, qualité, rupture de stock), capturez leurs contacts WhatsApp et relancez-les pour des promotions ciblées.
          </p>
        </div>

        <div className="relative z-10 flex items-center space-x-3 shrink-0">
          <button
            onClick={() => openSurveyModal()}
            className="flex items-center space-x-2 px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer border border-emerald-400/30"
          >
            <Plus className="w-5 h-5" />
            <span>Enregistrer une Visite</span>
          </button>
        </div>
      </div>

      {/* 2. Cartes KPIs & Tableau de Bord Visites */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Visites */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visites Enregistrées</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalSurveys}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center space-x-2">
              <span className="text-indigo-600 font-bold">{todaySurveys} aujourd'hui</span>
              <span>•</span>
              <span>{thisMonthSurveys} ce mois</span>
            </div>
          </div>
        </div>

        {/* Motif n°1 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Motif N°1 de Refus</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-xl font-black text-slate-900 truncate">
              {totalSurveys > 0 ? NON_PURCHASE_REASON_LABELS[topReasonKey].label : 'Aucun motif'}
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-1">
              {totalSurveys > 0 ? `${topReasonPercent}% des visiteurs sans achat` : 'Commencez à sonder'}
            </div>
          </div>
        </div>

        {/* Ruptures de Stock Perdues */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ruptures de Stock</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <PackageX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{outOfStockSurveysCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Ventes perdues faute de stock
            </div>
          </div>
        </div>

        {/* Contacts WhatsApp Collectés */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prospects WhatsApp</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <MessageCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">{withWhatsAppCount}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">
              {totalSurveys > 0 ? `${Math.round((withWhatsAppCount / totalSurveys) * 100)}% contactables en promo` : '0 contact'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Onglets de Navigation : Répertoire Prospects VS Statistiques & Motifs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('prospects')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'prospects'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Répertoire des Visiteurs & Relance WhatsApp ({filteredSurveys.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistiques & Analyse des Motifs de Non-Achat</span>
        </button>
      </div>

      {/* 4. CONTENU SOUS-ONGLET 1 : RÉPERTOIRE & ACTIONS WHATSAPP */}
      {activeSubTab === 'prospects' && (
        <div className="space-y-4">
          {/* Barre de Recherche et Filtres */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, WhatsApp, produit demandé ou motif..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Sélecteur de motif */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white"
              >
                <option value="all">Tous les motifs</option>
                <option value="PRICE_TOO_HIGH">💰 Prix trop élevé ({reasonCounts.PRICE_TOO_HIGH})</option>
                <option value="OUT_OF_STOCK">📦 Rupture de stock ({reasonCounts.OUT_OF_STOCK})</option>
                <option value="QUALITY_CONCERN">💎 Qualité / Ne convient pas ({reasonCounts.QUALITY_CONCERN})</option>
                <option value="JUST_LOOKING">👀 Simple visite / Réflexion ({reasonCounts.JUST_LOOKING})</option>
                <option value="PAYMENT_METHOD">💳 Moyen de paiement ({reasonCounts.PAYMENT_METHOD})</option>
                <option value="OTHER">✍️ Autre motif ({reasonCounts.OTHER})</option>
              </select>

              {/* Filtre Avec WhatsApp Uniquement */}
              <button
                type="button"
                onClick={() => setFilterHasPhone(!filterHasPhone)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
                  filterHasPhone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp ({withWhatsAppCount})</span>
              </button>
            </div>
          </div>

          {/* Liste des Visiteurs / Sondages */}
          {filteredSurveys.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800">Aucune visite trouvée</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {surveys.length === 0
                  ? "Vous n'avez pas encore enregistré de visite. Cliquez sur le bouton ci-dessous pour sonder votre premier visiteur."
                  : 'Aucun enregistrement ne correspond à vos filtres de recherche.'}
              </p>
              <button
                onClick={() => openSurveyModal()}
                className="mt-2 inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer une Visite</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSurveys.map((survey) => {
                const reasonInfo = NON_PURCHASE_REASON_LABELS[survey.reason] || NON_PURCHASE_REASON_LABELS.OTHER;
                const hasPhone = (survey.whatsappNumber || '').trim().length > 3;

                return (
                  <div
                    key={survey.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden"
                  >
                    {/* Header carte */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-base">{reasonInfo.icon}</span>
                          <span className="text-xs font-black text-slate-900">
                            {survey.visitorName || 'Visiteur Anonyme'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                          <span>{survey.date}</span>
                          <span>•</span>
                          <span>{survey.recordedBy}</span>
                        </div>
                      </div>

                      {/* Badge Motif */}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                          survey.reason === 'PRICE_TOO_HIGH'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : survey.reason === 'OUT_OF_STOCK'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : survey.reason === 'QUALITY_CONCERN'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {reasonInfo.label}
                      </span>
                    </div>

                    {/* Produit demandé & Écart de prix */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{survey.requestedProduct}</span>
                      </div>

                      {(survey.actualPrice || survey.budgetProposed) && (
                        <div className="flex items-center space-x-3 text-[11px] font-semibold pt-0.5">
                          {survey.actualPrice && (
                            <span className="text-slate-600">
                              Prix boutique: <strong className="text-slate-900">{survey.actualPrice.toLocaleString('fr-FR')} F</strong>
                            </span>
                          )}
                          {survey.budgetProposed && (
                            <span className="text-emerald-700">
                              Budget client: <strong>{survey.budgetProposed.toLocaleString('fr-FR')} F</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {survey.reasonDetails && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/60 mt-1">
                          « {survey.reasonDetails} »
                        </p>
                      )}
                    </div>

                    {/* Coordonnées & Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {hasPhone ? (
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700">
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>{survey.whatsappNumber}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Pas de numéro renseigné</span>
                      )}

                      <div className="flex items-center space-x-1">
                        {hasPhone && (
                          <button
                            type="button"
                            onClick={() => setSelectedSurveyForPromo(survey)}
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer shadow-sm shadow-emerald-500/20 active:scale-95 flex items-center space-x-1 px-2.5 text-xs font-extrabold"
                            title="Contacter sur WhatsApp pour une promotion ou un arrivage"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp Promo</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openSurveyModal(survey)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(survey.id, survey.visitorName)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. CONTENU SOUS-ONGLET 2 : STATISTIQUES & ANALYSES */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Section 1 : Barres de Répartition des Motifs de Non-Achat */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Pourquoi vos visiteurs repartent-ils sans acheter ?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Répartition des motifs de refus sur un total de {totalSurveys} visites analysées
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-full">
                Sondage en Direct
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {(Object.keys(reasonCounts) as NonPurchaseReason[]).map((rk) => {
                const info = NON_PURCHASE_REASON_LABELS[rk];
                const count = reasonCounts[rk];
                const pct = totalSurveys > 0 ? Math.round((count / totalSurveys) * 100) : 0;

                const barColor =
                  rk === 'PRICE_TOO_HIGH'
                    ? 'bg-rose-500'
                    : rk === 'OUT_OF_STOCK'
                    ? 'bg-amber-500'
                    : rk === 'QUALITY_CONCERN'
                    ? 'bg-purple-500'
                    : rk === 'JUST_LOOKING'
                    ? 'bg-blue-500'
                    : rk === 'PAYMENT_METHOD'
                    ? 'bg-emerald-500'
                    : 'bg-slate-500';

                return (
                  <div key={rk} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center space-x-2">
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {count} visite{count > 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                    {/* Barre de progression */}
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium pl-6">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2 : Top Demandes / Produits les Plus Recherchés Sans Achat */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Top des Articles Demandés (Opportunités Commerciales)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Quels sont les articles que les clients demandent le plus souvent en boutique ?
              </p>
            </div>

            {productDemandMap.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">Aucune demande enregistrée pour le moment.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {productDemandMap.slice(0, 8).map((item, idx) => (
                  <div key={item.name} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                          {item.reasons['PRICE_TOO_HIGH'] && (
                            <span className="text-rose-600 font-semibold">
                              💰 {item.reasons['PRICE_TOO_HIGH']}x prix trop cher
                            </span>
                          )}
                          {item.reasons['OUT_OF_STOCK'] && (
                            <span className="text-amber-600 font-semibold">
                              📦 {item.reasons['OUT_OF_STOCK']}x rupture stock
                            </span>
                          )}
                          {item.reasons['QUALITY_CONCERN'] && (
                            <span className="text-purple-600 font-semibold">
                              💎 {item.reasons['QUALITY_CONCERN']}x qualité/taille
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                        {item.count} demande{item.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3 : Recommandations Stratégiques pour le Gérant */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-3xl border border-indigo-100 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-900 font-black text-sm">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Recommandations & Conseils Stratégiques</span>
            </div>
            <ul className="text-xs text-indigo-950 space-y-2 font-medium">
              {outOfStockSurveysCount > 0 && (
                <li className="flex items-start space-x-2">
                  <span className="text-amber-600 font-bold">⚠️</span>
                  <span>
                    <strong>Priorité Réassort :</strong> Vous avez {outOfStockSurveysCount} visiteurs qui n'ont pas pu acheter à cause d'une rupture de stock. Contactez vos fournisseurs pour commander ces articles.
                  </span>
                </li>
              )}
              {priceTooHighSurveysCount > 0 && (
                <li className="flex items-start space-x-2">
                  <span className="text-rose-600 font-bold">💰</span>
                  <span>
                    <strong>Élasticité Prix :</strong> {priceTooHighSurveysCount} visiteurs ont trouvé vos tarifs trop élevés. Pensez à proposer des remises par lot ou à utiliser le bouton WhatsApp Promotion pour leur envoyer une offre spéciale.
                  </span>
                </li>
              )}
              {withWhatsAppCount > 0 && (
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">📱</span>
                  <span>
                    <strong>Base CRM Active :</strong> Vous avez {withWhatsAppCount} numéros WhatsApp de prospects qualifiés prêts à recevoir vos annonces et arrivages.
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* 6. MODAL D'ENVOI DE PROMOTION WHATSAPP */}
      {selectedSurveyForPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Contacter {selectedSurveyForPromo.visitorName || 'le Prospect'} sur WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedSurveyForPromo.whatsappNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSurveyForPromo(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Choix du modèle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Choisissez le modèle de message :</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPromoTemplate('promo')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    promoTemplate === 'promo'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🎁 Remise Promotionnelle
                </button>
                <button
                  type="button"
                  onClick={() => setPromoTemplate('reassort')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    promoTemplate === 'reassort'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📦 Arrivage & Réassort
                </button>
                <button
                  type="button"
                  onClick={() => setPromoTemplate('info')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    promoTemplate === 'info'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  💬 Suivi & Renseignement
                </button>
                <button
                  type="button"
                  onClick={() => setPromoTemplate('custom')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    promoTemplate === 'custom'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ✍️ Message Personnalisé
                </button>
              </div>
            </div>

            {/* Aperçu du message */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Aperçu du texte envoyé :</label>
              {promoTemplate === 'custom' ? (
                <textarea
                  rows={4}
                  value={customPromoMessage}
                  onChange={(e) => setCustomPromoMessage(e.target.value)}
                  placeholder="Tapez votre message personnalisé..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              ) : (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-800 font-medium">
                  {generateWhatsAppMessage(selectedSurveyForPromo, promoTemplate)}
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSurveyForPromo(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleOpenWhatsApp(selectedSurveyForPromo)}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Ouvrir WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
