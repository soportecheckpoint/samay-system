import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  useTimerStore,
  useMessageStore,
  useFeedbackStore,
  useVictoryStore,
  useTabletMirrorStore,
  useTabletSyncStore,
  useConnectionStore,
  useWinOverlayStore,
} from './store';
import type { TabletStep, WinOverlayVariant } from './store';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket: Socket | null = null;

type TimerSnapshot = {
  total?: number;
  elapsed?: number;
  remaining?: number;
  status?: 'waiting' | 'active' | 'paused' | 'completed';
};

type TabletMirrorPayload = {
  screen?: string;
  step?: number;
  content?: Record<string, unknown>;
  updatedAt?: string;
};

type TabletStatePayload = {
  currentStep?: TabletStep | '';
  currentView?: string;
  sessionId?: string;
  selectedMessage?: string;
  feedbackText?: string;
  photoData?: string | null;
  frameMessage?: string;
  mirror?: TabletMirrorPayload;
};

type ClientStatePayload = {
  session?: TimerSnapshot;
  tablet?: TabletStatePayload;
};

type PreviousMessagePayload = {
  message?: string;
  teamName?: string;
  updatedAt?: string;
};

const applyTabletMirror = (mirror?: TabletMirrorPayload) => {
  if (!mirror) {
    return;
  }

  useTabletMirrorStore.getState().hydrate({
    screen: typeof mirror.screen === 'string' ? mirror.screen : undefined,
    step: typeof mirror.step === 'number' ? mirror.step : undefined,
    content:
      typeof mirror.content === 'object' && mirror.content !== null
        ? { ...(mirror.content as Record<string, unknown>) }
        : undefined,
    updatedAt: typeof mirror.updatedAt === 'string' ? mirror.updatedAt : new Date().toISOString(),
  });
};

const applyTabletState = (tablet?: TabletStatePayload) => {
  if (!tablet) {
    return;
  }

  useTabletSyncStore.getState().hydrate({
    sessionId: tablet.sessionId,
    currentView: tablet.currentView,
    currentStep: tablet.currentStep,
    selectedMessage: tablet.selectedMessage,
    feedbackText: tablet.feedbackText,
    frameMessage: tablet.frameMessage,
    photoData: typeof tablet.photoData === 'undefined' ? undefined : tablet.photoData ?? null,
  });

  const trimmedMessage =
    typeof tablet.selectedMessage === 'string' ? tablet.selectedMessage.trim() : '';

  if (trimmedMessage) {
    useMessageStore.getState().setMessage(trimmedMessage, tablet.sessionId ?? '');
  }

  if (tablet.mirror) {
    applyTabletMirror(tablet.mirror);
  }
};

const applyTimerSnapshot = (snapshot?: TimerSnapshot) => {
  if (!snapshot) {
    return;
  }
  useTimerStore.getState().hydrate(snapshot);
};

export const useSocket = () => {
  useEffect(() => {
    if (!socket) {
      console.log('[MAIN-SCREEN] Initializing socket connection to:', SERVER_URL);
      socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('[MAIN-SCREEN] Connected to server');
        useConnectionStore.getState().setConnected(true);
        socket?.emit('register', { appType: 'main-screen', sessionId: 'MAIN_SCREEN_SESSION' });
        console.log('[MAIN-SCREEN] Register event emitted');
      });

      socket.on('state:update', (payload: ClientStatePayload) => {
        applyTimerSnapshot(payload.session);
        applyTabletState(payload.tablet);
      });

      socket.on('timer:update', (snapshot: TimerSnapshot) => {
        applyTimerSnapshot(snapshot);
      });

      socket.on('timer:stop', (data: { reason: string; finalTime: number }) => {
        useTimerStore.getState().markCompleted(data?.finalTime);
      });

      socket.on('timer:reset', (snapshot: TimerSnapshot) => {
        applyTimerSnapshot(snapshot);
        useVictoryStore.getState().reset();
        useWinOverlayStore.getState().hide();
      });

      socket.on('game:reset', () => {
        console.log('[MAIN-SCREEN] Game reset received');
        useTimerStore.getState().hydrate({ total: 0, elapsed: 0, remaining: 0, status: 'waiting' });
        useVictoryStore.getState().reset();
        useFeedbackStore.getState().clear();
        useTabletSyncStore.getState().reset();
        useTabletMirrorStore.getState().reset();
        useWinOverlayStore.getState().hide();
      });

      socket.on('tablet:state', (tablet: TabletStatePayload) => {
        applyTabletState(tablet);
      });

      socket.on('tablet:message-selected', (data: { messageText: string }) => {
        if (typeof data?.messageText === 'string') {
          const trimmedMessage = data.messageText.trim();
          if (trimmedMessage) {
            useMessageStore.getState().setMessage(trimmedMessage, '');
          }
          useTabletSyncStore.getState().hydrate({ selectedMessage: data.messageText });
        }
      });

      socket.on('tablet:step-change', (data: { step: TabletStep }) => {
        if (data?.step) {
          useTabletSyncStore.getState().hydrate({ currentStep: data.step });
        }
      });

      socket.on('tablet:frame-message', (data: { message: string; photoData?: string | null }) => {
        useTabletSyncStore.getState().hydrate({
          frameMessage: typeof data?.message === 'string' ? data.message : '',
          photoData: typeof data?.photoData === 'undefined' ? undefined : data.photoData ?? null,
        });
      });

      socket.on('tablet:reset', () => {
        useTabletSyncStore.getState().reset();
        useTabletMirrorStore.getState().reset();
      });

      socket.on('tablet:view-change', (data: { viewId?: string }) => {
        const viewId = typeof data?.viewId === 'string' && data.viewId ? data.viewId : 'camera-preview';
        useTabletSyncStore.getState().hydrate({ currentView: viewId });
      });

      socket.on('feedback:message', (data: { message: string; type: 'success' | 'info' | 'warning' | 'error' }) => {
        useFeedbackStore.getState().setFeedback(data.message, data.type);
        setTimeout(() => {
          useFeedbackStore.getState().clear();
        }, 5000);
      });

      socket.on('game:victory', (data: { message: string; finalTime: number }) => {
        useVictoryStore.getState().setVictory(data.finalTime);
        useTimerStore.getState().markCompleted(data.finalTime);
      });

      socket.on('main-screen:show-win', (data: { image?: string; variant?: WinOverlayVariant }) => {
        const image = typeof data?.image === 'string' ? data.image : '';
        if (!image) {
          return;
        }

        const variant: WinOverlayVariant = data?.variant === 'final' ? 'final' : 'message';
        useWinOverlayStore.getState().show(image, variant);
      });

      socket.on('main-screen:hide-win', () => {
        useWinOverlayStore.getState().hide();
      });

      socket.on('tablet:mirror', (data: TabletMirrorPayload) => {
        const mirrorPayload: TabletMirrorPayload = {
          screen: typeof data?.screen === 'string' ? data.screen : '',
          step: typeof data?.step === 'number' ? data.step : Number(data?.step) || 0,
          content:
            typeof data?.content === 'object' && data.content !== null ? data.content : {},
          updatedAt: new Date().toISOString(),
        };

        applyTabletMirror(mirrorPayload);

        const contentRecord = (mirrorPayload.content ?? {}) as Record<string, unknown>;
        const syncSnapshot: Partial<{
          selectedMessage: string;
          feedbackText: string;
          frameMessage: string;
          photoData: string | null;
        }> = {};
        const tabletState = useTabletSyncStore.getState();

        if (typeof contentRecord.messageText === 'string') {
          syncSnapshot.selectedMessage = contentRecord.messageText;
          const trimmedMessage = contentRecord.messageText.trim();
          if (trimmedMessage) {
            useMessageStore
              .getState()
              .setMessage(trimmedMessage, tabletState.sessionId ?? '');
          }
        }

        if (typeof contentRecord.feedbackText === 'string') {
          syncSnapshot.feedbackText = contentRecord.feedbackText;
        }

        if (typeof contentRecord.frameMessage === 'string') {
          syncSnapshot.frameMessage = contentRecord.frameMessage;
        }

        if (typeof contentRecord.photoData === 'string' || contentRecord.photoData === null) {
          syncSnapshot.photoData = (contentRecord.photoData as string | null) ?? null;
        }

        if (Object.keys(syncSnapshot).length > 0) {
          tabletState.hydrate(syncSnapshot);
        }
      });

      socket.on('disconnect', () => {
        console.log('[MAIN-SCREEN] Disconnected from server');
        useConnectionStore.getState().setConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[MAIN-SCREEN] Connection error:', error);
        useConnectionStore.getState().setConnected(false);
      });

      socket.on('main-screen:previous-message', (data: PreviousMessagePayload) => {
        const message = typeof data?.message === 'string' ? data.message.trim() : '';
        const teamName = typeof data?.teamName === 'string' ? data.teamName.trim() : '';

        if (message) {
          useMessageStore.getState().setMessage(message, teamName);
        } else {
          useMessageStore.getState().hydrate('', teamName);
        }
      });
    }

    return () => {
      if (socket) {
        console.log('[MAIN-SCREEN] Cleaning up socket');
        socket.disconnect();
        socket = null;
        useConnectionStore.getState().setConnected(false);
      }
    };
  }, []);

  return socket;
};
