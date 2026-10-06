import { ThemeStyle } from '../types';

export interface ThemeConfig {
  id: ThemeStyle;
  name: string;
  subtitle: string;
  tagline: string;
  accentColor: string;
  accentBg: string;
  bodyBg: string;
  surfaceBg: string;
  sidebarBg: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  cardRadius: string;
  buttonRadius: string;
  previewSample: string;
}

export const THEME_CONFIGS: Record<ThemeStyle, ThemeConfig> = {
  modern_saas: {
    id: 'modern_saas',
    name: 'SaaS Moderne Épuré',
    subtitle: 'Cobalt & Blanc Alpin',
    tagline: 'Standard B2B clair, contraste maîtrisé, rigueur typographique suisse.',
    accentColor: '#2563EB',
    accentBg: 'bg-blue-600',
    bodyBg: 'bg-slate-50',
    surfaceBg: 'bg-white',
    sidebarBg: 'bg-white',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-900',
    mutedTextColor: 'text-slate-500',
    cardRadius: 'rounded-xl',
    buttonRadius: 'rounded-lg',
    previewSample: 'from-blue-600 to-indigo-600',
  },
  dark_logistics: {
    id: 'dark_logistics',
    name: 'Console Logistique Dark',
    subtitle: 'Charbon & Télémétrie Ambre',
    tagline: 'Écran opérateur haute cadence, contraste nocturne, lisibilité des codes-barres.',
    accentColor: '#F59E0B',
    accentBg: 'bg-amber-500',
    bodyBg: 'bg-slate-950',
    surfaceBg: 'bg-slate-900',
    sidebarBg: 'bg-slate-900',
    borderColor: 'border-slate-800',
    textColor: 'text-slate-100',
    mutedTextColor: 'text-slate-400',
    cardRadius: 'rounded-lg',
    buttonRadius: 'rounded-md',
    previewSample: 'from-amber-500 to-orange-600',
  },
  luxury_boutique: {
    id: 'luxury_boutique',
    name: 'Boutique & Haute Joaillerie',
    subtitle: 'Travertin & Bronze Fumé',
    tagline: 'Atmosphère feutrée, espacements amples, valorisation des matières nobles.',
    accentColor: '#9A6B3D',
    accentBg: 'bg-stone-800',
    bodyBg: 'bg-[#FBF9F5]',
    surfaceBg: 'bg-white',
    sidebarBg: 'bg-[#F6F3ED]',
    borderColor: 'border-stone-200/80',
    textColor: 'text-stone-900',
    mutedTextColor: 'text-stone-500',
    cardRadius: 'rounded-2xl',
    buttonRadius: 'rounded-xl',
    previewSample: 'from-stone-700 to-amber-900',
  },
  nordic_clean: {
    id: 'nordic_clean',
    name: 'Studio Nordique Éco',
    subtitle: 'Blanc Minéral & Épicéa',
    tagline: 'Lignes architecturales pures, bordures fines, palettes organiques apaisées.',
    accentColor: '#0F766E',
    accentBg: 'bg-teal-700',
    bodyBg: 'bg-[#F8FAFB]',
    surfaceBg: 'bg-white',
    sidebarBg: 'bg-white',
    borderColor: 'border-slate-200/90',
    textColor: 'text-slate-800',
    mutedTextColor: 'text-slate-500',
    cardRadius: 'rounded-md',
    buttonRadius: 'rounded-md',
    previewSample: 'from-teal-700 to-emerald-800',
  },
};
