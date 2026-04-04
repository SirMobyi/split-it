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

export const LIGHT_COLORS = {
  background: '#F5F5F7',        // Apple-style light gray
  surface: '#FFFFFF',            // Pure white cards (clear contrast)
  surface2: '#FFFFFF',           // White for tab bar / sheets
  surface3: '#F0ECF5',           // Subtle lavender for icon wraps
  border: '#E5E5EA',             // iOS system gray separator
  borderLight: '#D1D1D6',       // Slightly darker separator
  textPrimary: '#1C1C1E',       // iOS label color
  textSecondary: '#636366',      // iOS secondary label
  textTertiary: '#AEAEB2',      // iOS tertiary label
  accent: '#6D28D9',             // Deep violet (readable on white)
  accentLight: '#A78BFA',        // Soft violet
  accentDim: '#EDE9FE',          // Very light violet tint (button bg)
  danger: '#DC2626',
  dangerLight: '#FCA5A5',
  dangerDim: '#FEF2F2',
  warning: '#D97706',
  info: '#2563EB',
  success: '#059669',
  successLight: '#34D399',
} as const;

export type ColorPalette = {
  readonly background: string;
  readonly surface: string;
  readonly surface2: string;
  readonly surface3: string;
  readonly border: string;
  readonly borderLight: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly accent: string;
  readonly accentLight: string;
  readonly accentDim: string;
  readonly danger: string;
  readonly dangerLight: string;
  readonly dangerDim: string;
  readonly warning: string;
  readonly info: string;
  readonly success: string;
  readonly successLight: string;
};

export const THEMES = {
  dark: DARK_COLORS,
  light: LIGHT_COLORS,
} as const;

// Default export for backward compatibility — dark theme
export const COLORS = DARK_COLORS;

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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
