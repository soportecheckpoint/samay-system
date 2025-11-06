export type TabletStep =
  | 'qr-scan'
  | 'message-select'
  | 'feedback'
  | 'photo'
  | 'frame-message'
  | 'final-code';

export interface TabletMirrorState {
  screen: string;
  step: number;
  content: Record<string, unknown>;
  updatedAt: string;
}

export interface TabletState {
  currentStep: TabletStep;
  currentView: string;
  sessionId: string;
  selectedMessage: string;
  feedbackText: string;
  photoData: string | null;
  frameMessage: string;
  composedImage: string | null;
  composedImagePath: string | null;
  composedImageUrl: string | null;
  mirror: TabletMirrorState;
}

const createInitialMirror = (): TabletMirrorState => ({
  screen: '',
  step: 0,
  content: {},
  updatedAt: new Date().toISOString(),
});

const createInitialTabletState = (): TabletState => ({
  currentStep: 'qr-scan',
  currentView: 'camera-preview',
  sessionId: '',
  selectedMessage: '',
  feedbackText: '',
  photoData: null,
  frameMessage: '',
  composedImage: null,
  composedImagePath: null,
  composedImageUrl: null,
  mirror: createInitialMirror(),
});

const tabletState: TabletState = createInitialTabletState();

export const resetTabletState = (): TabletState => {
  const nextState = createInitialTabletState();
  Object.assign(tabletState, nextState);
  return getTabletState();
};

export const updateTabletState = (
  data: Partial<Omit<TabletState, 'mirror'>> & {
    mirror?: Partial<Omit<TabletMirrorState, 'updatedAt'>>;
  }
): TabletState => {
  const { mirror, ...stateData } = data;

  if (Object.keys(stateData).length > 0) {
    const sanitizedStateData = Object.fromEntries(
      Object.entries(stateData).filter(([, value]) => typeof value !== 'undefined'),
    ) as Partial<Omit<TabletState, 'mirror'>>;

    if (Object.keys(sanitizedStateData).length > 0) {
      Object.assign(tabletState, sanitizedStateData);
    }
  }

  if (mirror) {
    Object.assign(tabletState.mirror, mirror, {
      updatedAt: new Date().toISOString(),
    });
  }

  return getTabletState();
};

export const getTabletState = (): TabletState => ({
  currentStep: tabletState.currentStep,
  currentView: tabletState.currentView,
  sessionId: tabletState.sessionId,
  selectedMessage: tabletState.selectedMessage,
  feedbackText: tabletState.feedbackText,
  photoData: tabletState.photoData,
  frameMessage: tabletState.frameMessage,
  composedImage: tabletState.composedImage,
  composedImagePath: tabletState.composedImagePath,
  composedImageUrl: tabletState.composedImageUrl,
  mirror: {
    screen: tabletState.mirror.screen,
    step: tabletState.mirror.step,
    content: { ...tabletState.mirror.content },
    updatedAt: tabletState.mirror.updatedAt,
  },
});
