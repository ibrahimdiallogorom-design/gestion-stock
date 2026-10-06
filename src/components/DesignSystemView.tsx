import React from 'react';
import {
  Palette,
  Type,
  Layout,
  CheckCircle2,
  XCircle,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { THEME_CONFIGS } from './ThemeClasses';
import { ThemeStyle } from '../types';

export const DesignSystemView: React.FC = () => {
  const { theme, setTheme, setViewMode, setActiveTab } = useStock();

  const currentThemeConfig = THEME_CONFIGS[theme];

  const colorTokens = [
    {
      role: '60% Toile Neutre Principale (Canvas)',
      token: 'bg-slate-50 / #F8FAFC',
      hex: '#F8FAFC',
      usage: 'Fond de page, respiration visuelle, zéro distraction.',
      ratio: '21:1 (Noir sur Blanc)',
    },
    {
      role: '30% Surfaces & Cartes Structurelles',
      token: 'bg-white / #FFFFFF + border-slate-200',
      hex: '#FFFFFF',
      usage: 'Cartes à simple élévation, tableaux, en-têtes et modales.',
      ratio: '18.4:1',
    },
    {
      role: '10% Accent Principal (Cobalt Bleu)',
      token: 'bg-blue-600 / #2563EB',
      hex: '#2563EB',
      usage: 'Boutons d’action primaires, état actif de navigation, focus rings.',
      ratio: '4.8:1 (WCAG AA validé)',
    },
    {
      role: 'Sémantique Flux : Entrée / Conforme',
      token: 'text-emerald-700 / #047857',
      hex: '#047857',
      usage: 'Réceptions de stock, niveaux conformes, synchronisation réussie.',
      ratio: '5.2:1 (Lisibilité optimale)',
    },
    {
      role: 'Sémantique Flux : Seuil Critique',
      token: 'text-amber-700 / #B45309',
      hex: '#B45309',
      usage: 'Stock approchant le seuil de réapprovisionnement, attention requise.',
      ratio: '4.7:1',
    },
    {
      role: 'Sémantique Flux : Rupture Immédiate',
      token: 'text-rose-700 / #BE123C',
      hex: '#BE123C',
      usage: 'Stock à 0 unité, blocage de vente, avertissement destructif.',
      ratio: '5.6:1',
    },
  ];

  return (
    <div className="p-8 space-y-12 max-w-6xl mx-auto">
      {/* Title & Introduction */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">
          <Palette className="w-4 h-4" />
          <span>Charte Graphique & Spécifications UI</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Système de Design & Identité Visuelle StockFlow
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
          Cette planche de conception présente les choix typographiques, la grille modulaire 1440px, la règle Zéro-Pill pour les métadonnées et les 4 univers stylistiques conçus pour s'adapter à la personnalité de votre commerce.
        </p>
      </div>

      {/* 1. Theme Switcher Exhibition */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>1. Les 4 Univers Stylistiques Développés</span>
          </h2>
          <span className="text-xs text-slate-400">
            Cliquez pour tester l'impact visuel en direct sur l'interface
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(THEME_CONFIGS) as ThemeStyle[]).map((key) => {
            const cfg = THEME_CONFIGS[key];
            const isSelected = theme === key;
            return (
              <div
                key={key}
                onClick={() => setTheme(key)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative bg-white flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 shadow-md ring-2 ring-blue-600/10'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div
                    className={`h-16 w-full rounded-xl bg-gradient-to-r ${cfg.previewSample} mb-4 flex items-center justify-center text-white font-mono text-xs font-bold shadow-inner`}
                  >
                    {cfg.name.split(' ')[0]}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{cfg.name}</h3>
                  <p className="text-xs font-medium text-blue-600 mt-0.5">{cfg.subtitle}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {cfg.tagline}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold ${
                      isSelected ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {isSelected ? '● Thème Actif' : 'Sélectionner'}
                  </span>
                  <div
                    className="w-4 h-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: cfg.accentColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Color Palette & 60-30-10 Rule */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-600" />
          <span>2. Palette Chromatique & Règle des Proportions (60-30-10)</span>
        </h2>
        <p className="text-xs text-slate-500">
          Pour éviter la fatigue oculaire lors des inventaires prolongés, les contrastes sont strictement calibrés selon la norme WCAG AA.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {colorTokens.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border border-slate-200 shadow-2xs shrink-0"
                  style={{ backgroundColor: item.hex }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {item.role}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {item.hex} · {item.token.split(' ')[0]}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{item.usage}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Contraste :</span>
                <span className="font-mono text-emerald-700 font-semibold">{item.ratio}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Typography & Tabular Figures */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Type className="w-5 h-5 text-blue-600" />
          <span>3. Discipline Typographique & Chiffres Tabulaires (Tabular-Nums)</span>
        </h2>
        <p className="text-xs text-slate-500 -mt-3">
          Le principe du 2+1 : une police humaine lisible pour la narration (<strong>Plus Jakarta Sans</strong>) combinée avec une police mécanique pour l'alignement décimal des stocks (<strong>JetBrains Mono</strong>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">
              Plus Jakarta Sans — Structure & Hiérarchie
            </span>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                StockFlow Logistique & Vente
              </div>
              <div className="text-sm font-semibold text-slate-700">
                Sous-titres & Libellés de Navigation
              </div>
              <div className="text-xs text-slate-500">
                Corps de texte fluide et net, évitant le rendu générique d'Inter tout en assurant une lisibilité maximale à 13px–14px.
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-mono">
            <span className="text-xs font-bold text-slate-700 block font-sans">
              JetBrains Mono tabular-nums — Précision Financière & Stock
            </span>
            <div className="space-y-1 text-xs text-slate-800">
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span>SKU-001  Oxford Chemise</span>
                <span className="tabular-nums font-bold">28 pcs · 1 820.00 €</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200">
                <span>SKU-002  Pantalon Chino</span>
                <span className="tabular-nums font-bold">06 pcs ·   474.00 €</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>SKU-003  Casque Audio NC</span>
                <span className="tabular-nums font-bold">14 pcs · 2 086.00 €</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-2">
              Chaque chiffre occupe exactement la même largeur physique, garantissant un alignement vertical sans décalage.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Zero-Pill vs Slop Rules */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <span>4. Règle du Zéro-Pill & Élimination du Bruit Visuel</span>
        </h2>
        <p className="text-xs text-slate-500 -mt-3">
          Les interfaces génériques empilent souvent des « pilules » multicolores pour chaque métadonnée. StockFlow applique une discipline éditoriale épurée.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Bad Practice */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3">
            <div className="flex items-center gap-1.5 text-rose-700 font-bold">
              <XCircle className="w-4 h-4" />
              <span>À ÉVITER (AI Slop & Surcharge de Badges)</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-rose-200 flex items-center gap-2 flex-wrap">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                CHEMISE
              </span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                EN STOCK
              </span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                RAYON H-02
              </span>
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                MAJ 14:00
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Effet « sapin de Noël » : les yeux sont assaillis par les bordures et les couleurs, masquant l'information utile.
            </p>
          </div>

          {/* Good Practice (StockFlow Standard) */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>STANDARD STOCKFLOW (Typographie Épurée)</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-900">Chemise Oxford</span>
              <span className="text-slate-300">·</span>
              <span>Rayon H-02</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono tabular-nums text-emerald-700 font-bold">28 en stock</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400 font-mono">14:00</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Lisibilité immédiate : les séparateurs discrets (·) structurent la phrase sans aucune boîte artificielle.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Direct View Mode Actions */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <h3 className="text-lg font-bold">Prêt à explorer les rendus d'interface ?</h3>
          <p className="text-xs text-slate-300 mt-1">
            Basculez instantanément entre la vue en cartes visuelles boutique, la grille haute densité ou le tableau Kanban.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setViewMode('cards');
              setActiveTab('inventory');
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors"
          >
            Vue Cartes Visuelles
          </button>
          <button
            onClick={() => {
              setViewMode('kanban');
              setActiveTab('inventory');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Vue Tableau Kanban
          </button>
        </div>
      </div>
    </div>
  );
};
