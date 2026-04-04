import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  isLoaded: boolean;
  setTheme: (theme: Theme) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  isLoaded: false,

  setTheme: (theme: Theme) => {
    set({ theme });
    AsyncStorage.setItem('theme', theme);
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        set({ theme: saved, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));
