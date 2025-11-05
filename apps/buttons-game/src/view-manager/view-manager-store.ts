import { create } from "zustand";

export interface ViewState {
  currentView: string | null;
  viewHistory: string[];
  codeResetCounter: number;
  setView: (viewId: string) => void;
  goBack: () => void;
  resetFlow: (viewId: string) => void;
  resetCode: () => void;
}

const useViewStore = create<ViewState>((set: any) => ({
  currentView: 'code',
  viewHistory: ['code'],
  codeResetCounter: 0,

  setView: (viewId: string) =>
    set((state: ViewState) => {
      const newViewHistory = [...state.viewHistory, viewId];

      return {
        currentView: viewId,
        viewHistory: newViewHistory,
      };
    }),

  resetFlow: (viewId: string) =>
    set(() => ({
      currentView: viewId,
      viewHistory: [viewId],
    })),

  // Incrementing counter that components can watch to reset code inputs/local code state
  resetCode: () => set((state: ViewState) => ({ codeResetCounter: (state.codeResetCounter || 0) + 1 })),

  goBack: () =>
    set((state: ViewState) => {
      if (state.viewHistory.length < 2) {
        return { currentView: null };
      }

      const newViewHistory = state.viewHistory.slice(0, -1);
      const previousView = newViewHistory[newViewHistory.length - 1];

      return {
        currentView: previousView,
        viewHistory: newViewHistory,
      };
    }),
}));

export default useViewStore;
