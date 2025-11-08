import { create } from 'zustand';

interface Button {
  id: number;
  pressed: boolean;
  completed: boolean;
}

interface GameState {
  buttons: Button[];
  error: string;
  updateButtons: (buttons: Button[]) => void;
  setError: (error: string) => void;
  resetGame: () => void;
}

const createInitialButtons = (): Button[] =>
  Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    pressed: false,
    completed: false,
  }));

const initialButtons = createInitialButtons();

export const useGameStore = create<GameState>((set) => ({
  buttons: initialButtons,
  error: '',
  updateButtons: (buttons) => set({ buttons }),
  setError: (error) => set({ error }),
  resetGame: () => set({
    buttons: createInitialButtons(),
    error: '',
  }),
}));
