import { DARK_COLORS, LIGHT_COLORS } from '../constants/theme';
import type { ColorPalette } from '../constants/theme';
import { useThemeStore } from '../stores/theme-store';

/** Returns the currently selected color palette (dark by default). */
export function useColors(): ColorPalette {
  const theme = useThemeStore((s) => s.theme);
  return theme === 'light' ? LIGHT_COLORS as ColorPalette : DARK_COLORS as ColorPalette;
}
