import { create } from 'zustand';

export const FIXED_FINAL_CODE = '4286';

export type Step =
  | 'camera-preview'
  | 'message-select'
  | 'message-display'
  | 'feedback-input'
  | 'feedback-confirm'
  | 'photo-capture'
  | 'photo-message'
  | 'photo-preview'
  | 'final-message'
  | 'help-view'
  | 'final-view';

interface TabletState {
  currentStep: Step;
  sessionId: string;
  selectedMessage: string;
  feedbackText: string;
  photoData: string | null;
  photoMessage: string;
  finalCode: string;
  setStep: (step: Step) => void;
  setSessionId: (id: string) => void;
  setSelectedMessage: (message: string) => void;
  setFeedbackText: (text: string) => void;
  setPhotoData: (data: string | null) => void;
  setPhotoMessage: (message: string) => void;
  hydrate: (snapshot: Partial<Omit<TabletState, 'hydrate' | 'reset' | 'setStep' | 'setSessionId' | 'setSelectedMessage' | 'setFeedbackText' | 'setPhotoData' | 'setPhotoMessage' | 'finalCode'>>) => void;
  reset: () => void;
}

export const useTabletStore = create<TabletState>((set) => ({
  currentStep: 'camera-preview',
  sessionId: '',
  selectedMessage: '',
  feedbackText: '',
  photoData: null,
  photoMessage: '',
  finalCode: FIXED_FINAL_CODE,
  setStep: (step) => set({ currentStep: step }),
  setSessionId: (id) => set({ sessionId: id }),
  setSelectedMessage: (message) => set({ selectedMessage: message }),
  setFeedbackText: (text) => set({ feedbackText: text }),
  setPhotoData: (data) => set({ photoData: data }),
  setPhotoMessage: (message) => set({ photoMessage: message }),
  hydrate: (snapshot) =>
    set((state) => ({
      currentStep: snapshot.currentStep ?? state.currentStep,
      sessionId: snapshot.sessionId ?? state.sessionId,
      selectedMessage: snapshot.selectedMessage ?? state.selectedMessage,
      feedbackText: snapshot.feedbackText ?? state.feedbackText,
      photoData:
        typeof snapshot.photoData === 'undefined' ? state.photoData : snapshot.photoData,
      photoMessage: snapshot.photoMessage ?? state.photoMessage,
    })),
  reset: () => set(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tablet-feedback:last-photo');
    }

    return {
      currentStep: 'camera-preview',
      sessionId: '',
      selectedMessage: '',
      feedbackText: '',
      photoData: null,
      photoMessage: '',
      finalCode: FIXED_FINAL_CODE,
    };
  }),
}));
