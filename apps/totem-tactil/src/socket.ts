import { useEffect } from 'react';
import { io } from 'socket.io-client';
import useViewStore from './view-manager/view-manager-store';
import { useTotemStore } from './store';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const parseList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const MATCH_START_EVENTS = parseList(import.meta.env.VITE_TOTEM_MATCH_EVENTS, [
  'connections:state-changed',
  'tablero-conexiones:state-changed',
]);
const MATCH_MODULE_IDS = parseList(import.meta.env.VITE_TOTEM_MATCH_MODULES, []);

const NFC_COMPLETED_EVENTS = parseList(import.meta.env.VITE_TOTEM_NFC_EVENTS, [
  'nfc:state-changed',
  'rfid:state-changed',
  'tablero-nfc:state-changed',
]);
const NFC_MODULE_IDS = parseList(import.meta.env.VITE_TOTEM_NFC_MODULES, []);

type WinOverlayVariant = 'message' | 'final';

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export function useSocket() {
  useEffect(() => {
    const transitionToContractView = () => {
      const viewStore = useViewStore.getState();
      if (viewStore.currentView === 'contract') {
        return;
      }

      emitWinOverlay('/images/win_message.png', 'message');
      viewStore.setView('contract');
    };

    const handleConnect = () => {
      console.log('[TOTEM] Conectado al servidor');
      socket.emit('register', { appType: 'totem-tactil', sessionId: 'TOTEM_SESSION' });
    };

    const handleDisconnect = () => {
      console.log('[TOTEM] Desconectado del servidor');
    };

    const handleMatchActivation = (payload: Record<string, unknown> = {}) => {
      const completed = typeof (payload as { completed?: unknown }).completed === 'boolean'
        ? Boolean((payload as { completed?: unknown }).completed)
        : false;
      if (!completed) return;
      
      const totemState = useTotemStore.getState();

      const code = typeof (payload as { code?: unknown }).code === 'string'
        ? ((payload as { code?: unknown }).code as string).trim()
        : '';
      if (code.length > 0) {
        totemState.setMatchCode(code);
      }

      const viewStore = useViewStore.getState();
      if (viewStore.currentView === 'idle' || viewStore.currentView === 'match') {
        viewStore.setView('match');
      }
    };

    const handleNfcCompletion = (payload: Record<string, unknown> = {}) => {
      const completed = typeof (payload as { completed?: unknown }).completed === 'boolean'
        ? Boolean((payload as { completed?: unknown }).completed)
        : false;
      if (!completed) return;
      
      const totemState = useTotemStore.getState();
      
      if (!totemState.matchCompleted) return;
      
      const currentView = useViewStore.getState().currentView;
      if (currentView === 'message-code' || currentView === 'match') {
        transitionToContractView();
      }
    };

    const handleModuleCompleted = (data: { moduleId?: string; code?: string }) => {
      const moduleId = typeof data?.moduleId === 'string' ? data.moduleId.trim() : '';
      if (!moduleId) return;
      
      const viewState = useViewStore.getState();
      const totemState = useTotemStore.getState();

      if (MATCH_MODULE_IDS.includes(moduleId) && (viewState.currentView === 'idle' || viewState.currentView === 'match')) {
        if (typeof data?.code === 'string' && data.code.trim().length > 0) {
          totemState.setMatchCode(data.code.trim());
        }
        viewState.setView('match');
      }

      if (NFC_MODULE_IDS.includes(moduleId) && totemState.matchCompleted) {
        transitionToContractView();
      }
    };

    const handleLegacySixthBadge = () => {
      const totemState = useTotemStore.getState();
      if (!totemState.matchCompleted) return;
      transitionToContractView();
    };

    const handleForceSixthBadge = () => {
      console.log('[TOTEM] Forzando mostrar sexta insignia');
      const totemState = useTotemStore.getState();
      
      if (!totemState.matchCompleted) {
        totemState.markMatchCompleted();
      }
      transitionToContractView();
    };

    const handleReset = () => {
      console.log('[TOTEM] Reset recibido');
      emitWinOverlayClear();
      useTotemStore.getState().reset();
      useViewStore.getState().resetFlow('idle');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    MATCH_START_EVENTS.forEach((eventName) => {
      socket.on(eventName, handleMatchActivation);
    });

    NFC_COMPLETED_EVENTS.forEach((eventName) => {
      socket.on(eventName, handleNfcCompletion);
    });

    if (MATCH_MODULE_IDS.length > 0 || NFC_MODULE_IDS.length > 0) {
      socket.on('module:completed', handleModuleCompleted);
    }

    socket.on('totem:reset', handleReset);
    socket.on('game:reset', handleReset);
    socket.on('totem:show-sixth-badge', handleLegacySixthBadge);
    socket.on('totem:force-sixth-badge', handleForceSixthBadge);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      MATCH_START_EVENTS.forEach((eventName) => socket.off(eventName, handleMatchActivation));
      NFC_COMPLETED_EVENTS.forEach((eventName) => socket.off(eventName, handleNfcCompletion));
      socket.off('module:completed', handleModuleCompleted);
      socket.off('totem:reset', handleReset);
      socket.off('game:reset', handleReset);
      socket.off('totem:show-sixth-badge', handleLegacySixthBadge);
      socket.off('totem:force-sixth-badge', handleForceSixthBadge);
    };
  }, []);
}

export function emitMessagesOrdered(messages: string[]) {
  socket.emit('totem:messages-ordered', { messages });
  console.log('[TOTEM] Mensajes ordenados enviados:', messages);
}

export function emitWinOverlay(image: string, variant: WinOverlayVariant = 'message') {
  socket.emit('main-screen:show-win', { image, variant });
  console.log(`[TOTEM] Win overlay solicitado: ${image} (${variant})`);
}

export function emitWinOverlayClear() {
  socket.emit('main-screen:hide-win');
  console.log('[TOTEM] Win overlay limpiado');
}

export function emitContractAccepted() {
  socket.emit('totem:contract-accepted');
  console.log('[TOTEM] Contrato aceptado');
}
