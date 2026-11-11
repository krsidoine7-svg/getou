/**
 * Design Tokens — Forest Ledger
 * Spécifications officielles du Design System de GERETOU
 */

export const colors = {
  // Palette Principale : Vert Forêt (Confiance, Stabilité, Rigueur)
  primary: {
    DEFAULT: '#0B4F3A',
    dark: '#083E2D',
    light: '#14634B',
    container: '#D1E7DD',
    subtle: '#E8F3EE',
  },

  // Surfaces & Fonds neutres
  surface: {
    canvas: '#F8FAFC',    // Fond d'écran général
    card: '#FFFFFF',      // Surface des cartes et tuiles
    muted: '#F1F5F9',     // Conteneurs secondaires
    border: '#E2E8F0',    // Lignes de séparation & bordures (1px)
    borderFocus: '#0B4F3A',
  },

  // Textes & Typographie
  text: {
    primary: '#0F172A',   // Ardoise foncé (contraste maximal)
    secondary: '#475569', // Texte secondaire / libellés
    muted: '#94A3B8',     // Placeholders et désactivés
    inverted: '#FFFFFF',  // Sur fond sombre
  },

  // Accents Fonctionnels
  accent: {
    warning: '#F59E0B',   // Jaune Ambre (Alertes seuil 80 %, Dépassement)
    warningBg: '#FEF3C7',
    warningBorder: '#FDE68A',

    success: '#10B981',   // Vert Émeraude (Entrées d'argent, Budgets sains)
    successBg: '#D1FAE5',
    successBorder: '#A7F3D0',

    danger: '#EF4444',    // Rouge Corail (Dépassement 100%, Rupture stock, Dettes)
    dangerBg: '#FEE2E2',
    dangerBorder: '#FECACA',
  },

  // Marques Mobile Money
  brands: {
    wave: '#1BA7E8',      // Bleu Wave
    waveBg: '#E0F2FE',
    momo: '#FFCC00',      // Jaune MTN MoMo
    momoBg: '#FEF9C3',
    orange: '#FF7900',    // Orange Money
    orangeBg: '#FFEDD5',
    cash: '#64748B',      // Espèces
    cashBg: '#F1F5F9',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  screenPadding: 16,
  touchMinHeight: 48,
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,       // Standard Forest Ledger (rounded-md)
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  fontFamily: 'System', // Mappé sur Plus Jakarta Sans quand chargé
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  sizes: {
    caption: 11,
    bodySm: 13,
    body: 15,
    subtitle: 17,
    title: 20,
    headline: 24,
    hero: 32,
  },
} as const;

export const formatFCFA = (amount: number): string => {
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
};
