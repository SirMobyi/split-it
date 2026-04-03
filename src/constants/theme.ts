export const DARK_COLORS = {
  background: '#0B0915', // Vibrant Deep Indigo-Black
  surface: '#16142A',    // Deep Navy Surface
  surface2: '#1E1B3A',   // Navy Surface
  surface3: '#2D2A4A',   // Lighter Navy Surface
  border: '#2A264F',     // Deep Violet border
  borderLight: '#3D3770', // Light Violet border
  textPrimary: '#FFFFFF', // Pure White
  textSecondary: '#94A3B8', // Slate Gray
  textTertiary: '#64748B',  // Muted Slate
  accent: '#7C3AED',      // Electric Violet
  accentLight: '#A78BFA',  // Soft Violet
  accentDim: '#4C1D95',   // Deep Violet
  danger: '#F87171',
  dangerLight: '#FCA5A5',
  dangerDim: '#7F1D1D',
  warning: '#FBBF24',
  info: '#60A5FA',
  success: '#10B981',
  successLight: '#34D399',
} as const;

export type ColorPalette = typeof DARK_COLORS;

// Default export for backward compatibility — dark theme
export const COLORS = DARK_COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
} as const;

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
