import { create } from "zustand";

export interface ViewState {
  currentView: string | null;
  viewHistory: string[];
  setView: (viewId: string) => void;
  goBack: () => void;
  resetFlow: (viewId: string) => void;
  capturedImage: string | null;
  generatedImages: string[];
  selectedImage: string | null;
  setCapturedImage: (img: string) => void;
  setGeneratedImages: (images: string[]) => void;
  setSelectedImage: (img: string) => void;
  clearCapturedImage: () => void;
  selectedAnswerVideo: string | null;
  setSelectedAnswerVideo: (src: string | null) => void;
  resultDataUrl: string | null;
  uploadedUrl: string | null;
  setResultDataUrl: (dataUrl: string | null) => void;
  setUploadedUrl: (url: string | null) => void;
  videoMuted: boolean;
  setVideoMuted: (muted: boolean) => void;
}

const useViewStore = create<ViewState>((set: any) => ({
  currentView: 'idle',
  viewHistory: ['idle'],
  capturedImage: null,
  generatedImages: [],
  selectedImage: null,
  selectedAnswerVideo: null,
  resultDataUrl: null,
  uploadedUrl: null,
  videoMuted: true,

  setView: (viewId: string) =>
    set((state: ViewState) => {
      const newViewHistory = [...state.viewHistory, viewId];

      return {
        currentView: viewId,
        viewHistory: newViewHistory,
        // If we are going back to start, clear the previously selected frame/background
        selectedImage: viewId === 'start' ? null : state.selectedImage,
      };
    }),

  resetFlow: (viewId: string) =>
    set(() => ({
      currentView: viewId,
      viewHistory: [viewId],
      selectedImage: null,
      videoMuted: true,
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

  setCapturedImage: (img: string) => set({ capturedImage: img }),

  setGeneratedImages: (images: string[]) => set({ generatedImages: images }),

  setSelectedImage: (img: string) => set({ selectedImage: img }),

  clearCapturedImage: () => set({ capturedImage: null }),
  setSelectedAnswerVideo: (src: string | null) => set({ selectedAnswerVideo: src }),
  setResultDataUrl: (dataUrl: string | null) => set({ resultDataUrl: dataUrl }),
  setUploadedUrl: (url: string | null) => set({ uploadedUrl: url }),
  setVideoMuted: (muted: boolean) => set({ videoMuted: muted }),
}));

export default useViewStore;
