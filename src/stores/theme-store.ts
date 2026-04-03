import { create } from 'zustand';

interface ThemeState {
  isLoaded: boolean;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isLoaded: true,

  loadTheme: async () => {
    set({ isLoaded: true });
  },
}));
