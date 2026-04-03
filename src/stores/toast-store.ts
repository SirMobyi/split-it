import { create } from 'zustand';

export interface UndoToast {
  id: string;
  message: string;
  onUndo: () => Promise<void>;
  expiresAt: number; // timestamp
}

interface ToastState {
  toast: UndoToast | null;
  showUndoToast: (message: string, onUndo: () => Promise<void>, durationMs?: number) => void;
  dismissToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showUndoToast: (message, onUndo, durationMs = 3000) => {
    set({
      toast: {
        id: Date.now().toString(),
        message,
        onUndo,
        expiresAt: Date.now() + durationMs,
      },
    });
  },
  dismissToast: () => set({ toast: null }),
}));
