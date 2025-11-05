import { useEffect } from 'react';
import useViewStore from '../view-manager/view-manager-store';
import { emitTabletStep, emitTabletView } from '../socket';

type TabletStep = 'qr-scan' | 'message-select' | 'feedback' | 'photo' | 'frame-message' | 'final-code';

const VIEW_TO_STEP: Partial<Record<string, TabletStep>> = {
  'camera-preview': 'qr-scan',
  'message-select': 'message-select',
  'message-display': 'message-select',
  'feedback-input': 'feedback',
  'feedback-confirm': 'feedback',
  'photo-capture': 'photo',
  'photo-message': 'frame-message',
  'photo-preview': 'frame-message',
  'final-message': 'frame-message',
  'help-view': 'final-code',
  'final-view': 'final-code',
};

export const useTabletFlowSync = () => {
  const currentView = useViewStore((state) => state.currentView);

  useEffect(() => {
    if (!currentView) {
      return;
    }

    const nextStep = VIEW_TO_STEP[currentView];
    if (!nextStep) {
      emitTabletView(currentView);
      return;
    }

    emitTabletStep(nextStep);
    emitTabletView(currentView);
  }, [currentView]);
};
