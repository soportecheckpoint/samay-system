import { create } from 'zustand';

interface Button {
  id: number;
  pressed: boolean;
}

interface GameState {
  buttons: Button[];
  error: string;
  updateButtons: (buttons: Button[]) => void;
  setError: (error: string) => void;
  resetGame: () => void;
}

const initialButtons: Button[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  pressed: false,
}));

export const useGameStore = create<GameState>((set) => ({
  buttons: initialButtons,
  error: '',
  updateButtons: (buttons) => set({ buttons }),
  setError: (error) => set({ error }),
  resetGame: () => set({
    buttons: initialButtons,
    error: '',
  }),
}));
