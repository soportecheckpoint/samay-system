import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimerStatus = 'waiting' | 'active' | 'paused' | 'completed';

interface TimerState {
  total: number;
  elapsed: number;
  remaining: number;
  status: TimerStatus;
  hydrate: (snapshot: Partial<Omit<TimerState, 'hydrate' | 'markCompleted'>>) => void;
  markCompleted: (finalTime?: number) => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  total: 0,
  elapsed: 0,
  remaining: 0,
  status: 'waiting',
  hydrate: (snapshot) =>
    set((state) => ({
      total: snapshot.total ?? state.total,
      elapsed: snapshot.elapsed ?? state.elapsed,
      remaining: snapshot.remaining ?? state.remaining,
      status: snapshot.status ?? state.status,
    })),
  markCompleted: (finalTime) =>
    set((state) => ({
      status: 'completed',
      elapsed: typeof finalTime === 'number' ? finalTime : state.elapsed,
      remaining: 0,
      total: state.total,
    })),
}));

interface MessageState {
  previousMessage: string;
  teamName: string;
  setMessage: (message: string, team: string) => void;
  hydrate: (message?: string, team?: string) => void;
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set) => ({
      previousMessage: '',
      teamName: '',
      setMessage: (message, team) => set({ previousMessage: message, teamName: team }),
      hydrate: (message, team) =>
        set((state) => ({
          previousMessage: typeof message === 'string' ? message : state.previousMessage,
          teamName: typeof team === 'string' ? team : state.teamName,
        })),
    }),
    {
      name: 'main-screen-previous-message',
      version: 1,
    },
  ),
);

interface FeedbackState {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error' | '';
  setFeedback: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  clear: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  message: '',
  type: '',
  setFeedback: (message, type) => set({ message, type }),
  clear: () => set({ message: '', type: '' }),
}));

interface VictoryState {
  isVictory: boolean;
  finalTime: number;
  setVictory: (finalTime: number) => void;
  reset: () => void;
}

export const useVictoryStore = create<VictoryState>((set) => ({
  isVictory: false,
  finalTime: 0,
  setVictory: (finalTime) => set({ isVictory: true, finalTime }),
  reset: () => set({ isVictory: false, finalTime: 0 }),
}));

export type WinOverlayVariant = 'message' | 'final';

interface WinOverlayState {
  imageSrc: string | null;
  variant: WinOverlayVariant;
  show: (imageSrc: string, variant?: WinOverlayVariant) => void;
  hide: () => void;
}

export const useWinOverlayStore = create<WinOverlayState>((set) => ({
  imageSrc: null,
  variant: 'message',
  show: (imageSrc, variant = 'message') => set({ imageSrc, variant }),
  hide: () => set({ imageSrc: null, variant: 'message' }),
}));

interface ConnectionState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
}));

export type TabletStep = 'qr-scan' | 'message-select' | 'feedback' | 'photo' | 'frame-message' | 'final-code';

interface TabletSyncState {
  sessionId: string;
  currentView: string;
  currentStep: TabletStep | '';
  selectedMessage: string;
  feedbackText: string;
  frameMessage: string;
  photoData: string | null;
  hydrate: (snapshot: Partial<Omit<TabletSyncState, 'hydrate' | 'reset'>>) => void;
  reset: () => void;
}

const createInitialTabletSyncState = (): Omit<TabletSyncState, 'hydrate' | 'reset'> => ({
  sessionId: '',
  currentView: 'camera-preview',
  currentStep: '',
  selectedMessage: '',
  feedbackText: '',
  frameMessage: '',
  photoData: null,
});

export const useTabletSyncStore = create<TabletSyncState>((set) => ({
  ...createInitialTabletSyncState(),
  hydrate: (snapshot) =>
    set((state) => ({
      sessionId: typeof snapshot.sessionId === 'string' ? snapshot.sessionId : state.sessionId,
      currentView: typeof snapshot.currentView === 'string' ? snapshot.currentView : state.currentView,
      currentStep:
        typeof snapshot.currentStep === 'string' ? (snapshot.currentStep as TabletStep | '') : state.currentStep,
      selectedMessage:
        typeof snapshot.selectedMessage === 'string' ? snapshot.selectedMessage : state.selectedMessage,
      feedbackText:
        typeof snapshot.feedbackText === 'string' ? snapshot.feedbackText : state.feedbackText,
      frameMessage:
        typeof snapshot.frameMessage === 'string' ? snapshot.frameMessage : state.frameMessage,
      photoData:
        typeof snapshot.photoData === 'undefined' ? state.photoData : snapshot.photoData ?? null,
    })),
  reset: () => set(createInitialTabletSyncState()),
}));

interface TabletMirrorState {
  screen: string;
  step: number;
  content: Record<string, unknown>;
  updatedAt: string;
  hydrate: (snapshot: Partial<Omit<TabletMirrorState, 'hydrate' | 'reset'>>) => void;
  reset: () => void;
}

const createInitialTabletMirrorState = (): Omit<TabletMirrorState, 'hydrate' | 'reset'> => ({
  screen: '',
  step: 0,
  content: {},
  updatedAt: '',
});

export const useTabletMirrorStore = create<TabletMirrorState>((set) => ({
  ...createInitialTabletMirrorState(),
  hydrate: (snapshot) =>
    set((state) => ({
      screen: typeof snapshot.screen === 'string' ? snapshot.screen : state.screen,
      step: typeof snapshot.step === 'number' ? snapshot.step : state.step,
      content:
        typeof snapshot.content === 'object' && snapshot.content !== null
          ? { ...snapshot.content }
          : state.content,
      updatedAt: typeof snapshot.updatedAt === 'string' ? snapshot.updatedAt : state.updatedAt,
    })),
  reset: () => set(createInitialTabletMirrorState()),
}));
