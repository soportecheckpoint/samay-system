import { create } from 'zustand';

const DEFAULT_MATCH_CODE = import.meta.env.VITE_TOTEM_MATCH_CODE ?? '7482';

interface TotemState {
  matchCode: string;
  matchCompleted: boolean;

  setMatchCode: (code: string) => void;
  markMatchCompleted: () => void;
  reset: () => void;
}

export const useTotemStore = create<TotemState>((set, get) => ({
  matchCode: DEFAULT_MATCH_CODE,
  matchCompleted: false,

  setMatchCode: (code) => set({ matchCode: code }),

  markMatchCompleted: () => {
    if (!get().matchCompleted) {
      set({ matchCompleted: true });
    }
  },

  reset: () =>
    set({
      matchCode: DEFAULT_MATCH_CODE,
      matchCompleted: false,
    }),
}));
