// ---------------------------------------------------------------------------
// Split-It Design System
// ---------------------------------------------------------------------------

// -- Color Palettes ---------------------------------------------------------

export const DARK_COLORS = {
  background: '#0E0A1A',
  surface: '#181430',
  surface2: '#211D3D',
  surface3: '#2E2850',
  border: '#352F5E',
  borderLight: '#443D78',
  textPrimary: '#F5F3FF',
  textSecondary: '#A5A0C8',
  textTertiary: '#736D9E',
  accent: '#8B5CF6',
  accentLight: '#C4B5FD',
  accentMid: '#A78BFA',
  accentDim: '#4C2A85',
  accentSurface: '#1E1640',
  danger: '#F87171',
  dangerLight: '#FCA5A5',
  dangerDim: '#3B1A1A',
  warning: '#FBBF24',
  info: '#818CF8',
  success: '#34D399',
  successLight: '#6EE7B7',
  successDim: '#132B21',
} as const;

export type ColorPalette = typeof DARK_COLORS;

// Default export kept for backward compat — prefer useColors() hook instead.
export const COLORS = DARK_COLORS;

export const LIGHT_COLORS: ColorPalette = {
  background: '#FAFAFF',
  surface: '#F3F0FF',
  surface2: '#EDE8FF',
  surface3: '#E4DEFF',
  border: '#D8D0F0',
  borderLight: '#E8E2F8',
  textPrimary: '#1A1035',
  textSecondary: '#5B5280',
  textTertiary: '#8078A8',
  accent: '#7C3AED',
  accentLight: '#C4B5FD',
  accentMid: '#A78BFA',
  accentDim: '#EDE8FF',
  accentSurface: '#F6F3FF',
  danger: '#DC2626',
  dangerLight: '#FCA5A5',
  dangerDim: '#FEF2F2',
  warning: '#D97706',
  info: '#6366F1',
  success: '#059669',
  successLight: '#34D399',
  successDim: '#ECFDF5',
} as const;

export const THEMES = {
  dark: DARK_COLORS,
  light: LIGHT_COLORS,
} as const;

// -- Gradients --------------------------------------------------------------

export const GRADIENTS = {
  primary: ['#8B5CF6', '#7C3AED', '#6D28D9'] as const,
  lavender: ['#C4B5FD', '#A78BFA', '#8B5CF6'] as const,
  ambient: ['#F5F3FF', '#EDE9FE', '#DDD6FE'] as const,
  ambientDark: ['#0E0A1A', '#181430', '#211D3D'] as const,
  success: ['#34D399', '#10B981'] as const,
  warmAccent: ['#A78BFA', '#EC4899'] as const,
} as const;

// -- Typography -------------------------------------------------------------

export const TYPOGRAPHY = {
  displayLg: { fontSize: 38, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 46 },
  displayMd: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37, lineHeight: 41 },

  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },

  bodyLg: { fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
  bodyMd: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },

  labelLg: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  labelMd: { fontSize: 15, fontWeight: '500' as const, lineHeight: 20 },
  labelSm: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },

  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, lineHeight: 14 },

  monoLg: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1 },
  monoMd: { fontSize: 22, fontWeight: '700' as const },
  monoSm: { fontSize: 15, fontWeight: '600' as const },
} as const;

// -- Spacing ----------------------------------------------------------------

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  '4xl': 64,
} as const;

// -- Border Radius ----------------------------------------------------------

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

// -- Shadows (theme-aware) --------------------------------------------------

export function createShadows(isDark: boolean) {
  return {
    card: {
      shadowColor: isDark ? '#8B5CF6' : '#7C3AED',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.08 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardElevated: {
      shadowColor: isDark ? '#8B5CF6' : '#7C3AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.15 : 0.1,
      shadowRadius: 16,
      elevation: 6,
    },
    bottomSheet: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 20,
      elevation: 12,
    },
    button: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    glow: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
  } as const;
}

// Keep static SHADOWS for backward compat (will be replaced by createShadows)
export const SHADOWS = {
  card: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

// -- Currency ---------------------------------------------------------------

export const CURRENCY = {
  symbol: '₹',
  code: 'INR',
  locale: 'en-IN',
} as const;

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat(CURRENCY.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
};
