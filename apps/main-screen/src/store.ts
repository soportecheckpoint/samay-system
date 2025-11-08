import { create } from "zustand";

// Timer phase matching server StatusManager
export type TimerPhase = "idle" | "running" | "paused" | "won";

// Timer store with counter state
export interface TimerState {
  totalMs: number;
  remainingMs: number;
  phase: TimerPhase;
  update: (snapshot: Partial<Omit<TimerState, "update">>) => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  totalMs: 0,
  remainingMs: 0,
  phase: "idle",
  update: (snapshot) =>
    set((state) => ({
      totalMs: snapshot.totalMs ?? state.totalMs,
      remainingMs: snapshot.remainingMs ?? state.remainingMs,
      phase: snapshot.phase ?? state.phase,
    })),
}));

// Previous message store
interface PreviousMessageState {
  message: string;
  update: (message: string) => void;
}

export const usePreviousMessageStore = create<PreviousMessageState>((set) => ({
  message: "",
  update: (message) => set({ message }),
}));

// Tablet view types matching tablet-feedback viewIds
export type TabletViewType =
  | ""
  | "camera-preview"
  | "message-select"
  | "message-display"
  | "feedback-input"
  | "feedback-confirm"
  | "photo-capture"
  | "photo-message"
  | "photo-preview"
  | "final-message"
  | "help-view"
  | "final-view";

// Show image views for notifications and acceptance
export type ImageViewType = "notification" | "accept";

// Combined view type
export type ViewType = TabletViewType | ImageViewType;

// Main screen view state
interface ViewUpdateOptions {
  input?: string;
  photoPath?: string | null;
  recognitionPath?: string | null;
}

interface ViewState {
  currentView: ViewType;
  currentInput: string;
  photoPath: string | null;
  recognitionPath: string | null;
  setView: (view: ViewType, options?: ViewUpdateOptions) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: "",
  currentInput: "",
  photoPath: null,
  recognitionPath: null,
  setView: (view, options) =>
    set({
      currentView: view,
      currentInput: typeof options?.input === "string" ? options.input : "",
      photoPath: options?.photoPath ?? null,
      recognitionPath: options?.recognitionPath ?? null,
    }),
}));
