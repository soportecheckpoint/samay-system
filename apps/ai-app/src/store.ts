import { create } from 'zustand';

// Código correcto de 8 caracteres
const CORRECT_CODE = import.meta.env.VITE_AI_CODE || '01234567';

// Opción correcta del selector (índice basado en 0)
const CORRECT_SELECTOR_OPTION = 1; // "Le imprimes una tarjeta nueva y generas acceso a banca digital"

interface AiState {
  code: string;
  selectedOption: number | null;
  codeError: string;
  selectorError: string;
  
  setCode: (code: string) => void;
  setSelectedOption: (option: number) => void;
  setCodeError: (error: string) => void;
  setSelectorError: (error: string) => void;
  isCodeCorrect: () => boolean;
  isSelectorCorrect: () => boolean;
  reset: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  code: '',
  selectedOption: null,
  codeError: '',
  selectorError: '',

  setCode: (code) => set({ code }),
  setSelectedOption: (option) => set({ selectedOption: option }),
  setCodeError: (error) => set({ codeError: error }),
  setSelectorError: (error) => set({ selectorError: error }),
  
  isCodeCorrect: () => get().code === CORRECT_CODE,
  
  isSelectorCorrect: () => get().selectedOption === CORRECT_SELECTOR_OPTION,

  reset: () => set({
    code: '',
    selectedOption: null,
    codeError: '',
    selectorError: '',
  }),
}));

export { CORRECT_CODE, CORRECT_SELECTOR_OPTION };
