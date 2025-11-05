import { create } from "zustand";

export interface ViewState {
  currentView: string | null;
  viewHistory: string[];
  setView: (viewId: string) => void;
  goBack: () => void;
  resetFlow: (viewId: string) => void;
}

const useViewStore = create<ViewState>((set: any) => ({
  currentView: 'camera-preview',
  viewHistory: ['camera-preview'],

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
