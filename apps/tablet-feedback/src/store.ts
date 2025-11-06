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
  composedImage: string | null;
  composedImagePath: string | null;
  composedImageUrl: string | null;
  finalCode: string;
  setStep: (step: Step) => void;
  setSessionId: (id: string) => void;
  setSelectedMessage: (message: string) => void;
  setFeedbackText: (text: string) => void;
  setPhotoData: (data: string | null) => void;
  setPhotoMessage: (message: string) => void;
  setComposedImage: (data: string | null) => void;
  hydrate: (snapshot: Partial<Omit<TabletState, 'hydrate' | 'reset' | 'setStep' | 'setSessionId' | 'setSelectedMessage' | 'setFeedbackText' | 'setPhotoData' | 'setPhotoMessage' | 'setComposedImage' | 'finalCode'>>) => void;
  reset: () => void;
}

export const useTabletStore = create<TabletState>((set) => ({
  currentStep: 'camera-preview',
  sessionId: '',
  selectedMessage: '',
  feedbackText: '',
  photoData: null,
  photoMessage: '',
  composedImage: null,
  composedImagePath: null,
  composedImageUrl: null,
  finalCode: FIXED_FINAL_CODE,
  setStep: (step) => set({ currentStep: step }),
  setSessionId: (id) => set({ sessionId: id }),
  setSelectedMessage: (message) => set({ selectedMessage: message }),
  setFeedbackText: (text) => set({ feedbackText: text }),
  setPhotoData: (data) =>
    set({
      photoData: data,
      composedImage: null,
      composedImagePath: null,
      composedImageUrl: null,
    }),
  setPhotoMessage: (message) => set({ photoMessage: message }),
  setComposedImage: (data) =>
    set({
      composedImage: data,
      composedImagePath: null,
      composedImageUrl: null,
    }),
  hydrate: (snapshot) =>
    set((state) => ({
      currentStep: snapshot.currentStep ?? state.currentStep,
      sessionId: snapshot.sessionId ?? state.sessionId,
      selectedMessage: snapshot.selectedMessage ?? state.selectedMessage,
      feedbackText: snapshot.feedbackText ?? state.feedbackText,
      photoData:
        typeof snapshot.photoData === 'undefined' ? state.photoData : snapshot.photoData,
      photoMessage: snapshot.photoMessage ?? state.photoMessage,
      composedImage:
        typeof snapshot.composedImage === 'undefined'
          ? state.composedImage
          : snapshot.composedImage ?? null,
      composedImagePath:
        typeof snapshot.composedImagePath === 'undefined'
          ? state.composedImagePath
          : snapshot.composedImagePath ?? null,
      composedImageUrl:
        typeof snapshot.composedImageUrl === 'undefined'
          ? state.composedImageUrl
          : snapshot.composedImageUrl ?? null,
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
      composedImage: null,
  composedImagePath: null,
  composedImageUrl: null,
      finalCode: FIXED_FINAL_CODE,
    };
  }),
}));
