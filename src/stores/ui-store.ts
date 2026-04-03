import { create } from 'zustand';

interface UIState {
  activeGroupId: string | null;
  isAddExpenseOpen: boolean;
  isSettleUpOpen: boolean;
  setActiveGroup: (id: string | null) => void;
  openAddExpense: () => void;
  closeAddExpense: () => void;
  openSettleUp: () => void;
  closeSettleUp: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeGroupId: null,
  isAddExpenseOpen: false,
  isSettleUpOpen: false,
  setActiveGroup: (id) => set({ activeGroupId: id }),
  openAddExpense: () => set({ isAddExpenseOpen: true }),
  closeAddExpense: () => set({ isAddExpenseOpen: false }),
  openSettleUp: () => set({ isSettleUpOpen: true }),
  closeSettleUp: () => set({ isSettleUpOpen: false }),
}));
