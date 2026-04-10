import { DARK_COLORS, LIGHT_COLORS, GRADIENTS, createShadows } from '../constants/theme';
import type { ColorPalette } from '../constants/theme';
import { useThemeStore } from '../stores/theme-store';

/** Returns the currently selected color palette. */
export function useColors(): ColorPalette {
  const theme = useThemeStore((s) => s.theme);
  return theme === 'light' ? LIGHT_COLORS as ColorPalette : DARK_COLORS as ColorPalette;
}

/** Returns whether dark mode is active. */
export function useIsDark(): boolean {
  return useThemeStore((s) => s.theme) !== 'light';
}

/** Returns gradient arrays appropriate for current theme. */
export function useGradients() {
  const isDark = useIsDark();
  return {
    ...GRADIENTS,
    ambient: isDark ? GRADIENTS.ambientDark : GRADIENTS.ambient,
  };
}

/** Returns theme-aware shadow presets. */
export function useShadows() {
  const isDark = useIsDark();
  return createShadows(isDark);
}

/** All-in-one theme hook. */
export function useThemeAware() {
  const isDark = useIsDark();
  const colors = isDark ? DARK_COLORS as ColorPalette : LIGHT_COLORS as ColorPalette;
  const shadows = createShadows(isDark);
  return {
    colors,
    gradients: { ...GRADIENTS, ambient: isDark ? GRADIENTS.ambientDark : GRADIENTS.ambient },
    shadows,
    isDark,
  };
}
