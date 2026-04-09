import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeName = 'dark' | 'light';

interface ThemeState {
  isLoaded: boolean;
  theme: ThemeName;
  setTheme: (t: ThemeName) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = 'splitit:theme';

export const useThemeStore = create<ThemeState>((set) => ({
  isLoaded: false,
  theme: 'dark',
  setTheme: async (t: ThemeName) => {
    set({ theme: t });
    try {
      await AsyncStorage.setItem(THEME_KEY, t);
    } catch (e) {
      // ignore storage errors
    }
  },
  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        set({ theme: stored, isLoaded: true });
        return;
      }
    } catch (e) {
      // ignore
    }
    set({ isLoaded: true });
  },
}));
