import React, { useState, useMemo } from 'react';
import {
  Share2,
  Search,
  Filter,
  Check,
  Send,
  Printer,
  Plus,
  Camera,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  Copy,
  SlidersHorizontal,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Product } from '../types';

export const CatalogView: React.FC = () => {
  const { products, openProductModal, activeAppUser } = useStock();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const storeName = activeAppUser?.storeName || 'Boutique VisionTech';

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchStock = !inStockOnly || p.quantity > 0;

      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, selectedCategory, inStockOnly]);

  const totalInStock = products.filter((p) => p.quantity > 0).length;

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  // Generate single product WhatsApp text
  const shareSingleProductWhatsApp = (p: Product) => {
    const text = `🌟 *${storeName}* 🌟\n\n` +
      `🛍️ *${p.name.toUpperCase()}*\n` +
      `🏷️ *Réf :* ${p.sku}\n` +
      `💰 *Prix :* ${p.salePrice.toLocaleString('fr-FR')} FCFA\n` +
      `📦 *Disponibilité :* ${p.quantity > 0 ? `En stock (${p.quantity} dispo)` : 'Sur commande'}\n` +
      (p.description ? `📝 *Description :* ${p.description}\n` : '') +
      `\n📍 *Boutique :* ${storeName}\n` +
      `📞 Pour commander ou réserver, répondez directement à ce message !`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Generate multi-product / selection WhatsApp text
  const shareSelectedWhatsApp = () => {
    const toShare = products.filter((p) => selectedProductIds.has(p.id));
    if (toShare.length === 0) return;

    let text = `🌟 *CATALOGUE PRODUITS - ${storeName.toUpperCase()}* 🌟\n`;
    text += `Voici les articles sélectionnés pour vous :\n\n`;

    toShare.forEach((p, idx) => {
      text += `*${idx + 1}. ${p.name}*\n`;
      text += `💰 Prix : *${p.salePrice.toLocaleString('fr-FR')} FCFA*\n`;
      if (p.description) text += `📝 ${p.description}\n`;
      text += `📦 Dispo : ${p.quantity > 0 ? 'En stock' : 'Rupture'}\n\n`;
    });

    text += `📍 *${storeName}*\n`;
    text += `📞 Pour commander, répondez en indiquant le numéro du produit souhaité !`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Generate full catalog WhatsApp text
  const shareFullCatalogWhatsApp = () => {
    const inStockItems = products.filter((p) => p.quantity > 0);
    if (inStockItems.length === 0) {
      alert("Votre catalogue n'a aucun article actuellement en stock.");
      return;
    }

    let text = `🌟 *CATALOGUE OFFICIEL - ${storeName.toUpperCase()}* 🌟\n`;
    text += `Découvrez nos produits actuellement disponibles en boutique :\n\n`;

    // Group by category
    const grouped: Record<string, Product[]> = {};
    inStockItems.forEach((p) => {
      const cat = p.category || 'Autres';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    Object.entries(grouped).forEach(([cat, items]) => {
      text += `🔹 *${cat.toUpperCase()}* :\n`;
      items.forEach((p) => {
        text += `• *${p.name}* : ${p.salePrice.toLocaleString('fr-FR')} FCFA`;
        if (p.description) text += ` (${p.description})`;
        text += `\n`;
      });
      text += `\n`;
    });

    text += `📍 *${storeName}*\n`;
    text += `📞 Pour passer commande ou vous faire livrer, répondez directement à ce message !`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const copyCatalogToClipboard = () => {
    let text = `🌟 *CATALOGUE PRODUITS - ${storeName}* 🌟\n\n`;
    filteredProducts.forEach((p, idx) => {
      text += `${idx + 1}. ${p.name} - ${p.salePrice.toLocaleString('fr-FR')} FCFA\n`;
      if (p.description) text += `   ${p.description}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedNotification('Texte du catalogue copié dans le presse-papier !');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vitrine Commerciale Client</span>
              </span>
              <span className="text-xs text-blue-200">
                {products.length} référence(s) • {totalInStock} en stock
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Catalogue Produits & Partage WhatsApp
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Consultez les photos des articles et envoyez votre catalogue ou des fiches produits en un clic à vos clients par WhatsApp ou réseaux sociaux.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={shareFullCatalogWhatsApp}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              title="Envoyer tout le catalogue disponible sur WhatsApp"
            >
              <Send className="w-4 h-4" />
              <span>Envoyer Tout le Catalogue (WhatsApp)</span>
            </button>

            <button
              type="button"
              onClick={() => openProductModal()}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Ajouter un Article</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article, code SKU, description..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                inStockOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${inStockOnly ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>En stock seulement</span>
            </button>

            <button
              type="button"
              onClick={copyCatalogToClipboard}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Copier le texte du catalogue"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Copier</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Imprimer le catalogue"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Toutes les catégories ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Selection bar if items selected */}
        {selectedProductIds.size > 0 && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-900">
                {selectedProductIds.size} article(s) sélectionné(s)
              </span>
              <button
                type="button"
                onClick={() => setSelectedProductIds(new Set())}
                className="text-[11px] text-indigo-600 hover:underline"
              >
                Tout désélectionner
              </button>
            </div>

            <button
              type="button"
              onClick={shareSelectedWhatsApp}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Envoyer la sélection au client (WhatsApp)</span>
            </button>
          </div>
        )}
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Aucun produit ne correspond à vos filtres</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Essayez de modifier votre recherche ou ajoutez un nouvel article avec une photo.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setInStockOnly(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredProducts.map((p) => {
            const isSelected = selectedProductIds.has(p.id);
            const isAvailable = p.quantity > 0;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden shadow-2xs hover:shadow-md group ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                }`}
              >
                {/* Product Image Area */}
                <div className="relative w-full aspect-4/3 bg-slate-100 overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 p-4 text-center">
                      <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                      <span className="text-xs font-semibold text-slate-500">Pas de photo</span>
                      <button
                        type="button"
                        onClick={() => openProductModal(p)}
                        className="mt-2 text-[10px] text-blue-600 font-bold bg-white px-2.5 py-1 rounded-full shadow-2xs hover:bg-blue-50 transition-colors flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Ajouter photo</span>
                      </button>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-xs text-slate-800 shadow-2xs">
                      {p.category}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs ${
                        isAvailable
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isAvailable ? `En Stock (${p.quantity})` : 'Rupture'}
                    </span>
                  </div>

                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectProduct(p.id);
                    }}
                    className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-sm transition-transform active:scale-90 cursor-pointer"
                    title={isSelected ? "Désélectionner" : "Sélectionner pour envoi"}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                      <span>Réf : {p.sku}</span>
                      {p.location && <span className="truncate max-w-[120px]">{p.location}</span>}
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
                      {p.name}
                    </h3>

                    {p.description ? (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {p.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic mt-1">
                        Aucune description commerciale renseignée.
                      </p>
                    )}
                  </div>

                  {/* Price & Actions */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Prix Client :
                      </span>
                      <span className="text-base sm:text-lg font-black text-blue-700">
                        {p.salePrice.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => shareSingleProductWhatsApp(p)}
                        className="w-full py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        title="Partager cet article au client via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openProductModal(p)}
                        className="w-full py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Modifier la fiche produit ou changer la photo"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>Modifier</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
