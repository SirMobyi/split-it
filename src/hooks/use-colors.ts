import { THEMES } from '../constants/theme';
import type { ColorPalette } from '../constants/theme';
import { useThemeStore } from '../stores/theme-store';

/** Returns the currently selected color palette (light by default). */
export function useColors(): ColorPalette {
  const theme = useThemeStore((s) => s.theme);
  return THEMES[theme];
}
