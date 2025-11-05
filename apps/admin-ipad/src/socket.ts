import { useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  useAdminStore,
} from './store';
import type { ServerAdminPayload, ServerArduinoPayload } from './store';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

type CustomEventAck = { ok: boolean; error?: string };

export function useSocket() {
  const setConnected = useAdminStore((state) => state.setConnected);
  const hydrateState = useAdminStore((state) => state.hydrateState);
  const setArduinos = useAdminStore((state) => state.setArduinos);
  const setGameCompleted = useAdminStore((state) => state.setGameCompleted);

  useEffect(() => {
    let polling: ReturnType<typeof setInterval> | undefined;

    const requestState = () => {
      socket.emit('admin:get-state');
    };

    const handleConnect = () => {
      setConnected(true);
      socket.emit('register', {
        appType: 'admin-ipad',
        sessionId: 'ADMIN_SESSION',
      });
      requestState();
      polling = setInterval(() => {
        if (socket.connected) {
          requestState();
        }
      }, 5000);
    };

    const handleDisconnect = () => {
      setConnected(false);
      if (polling) {
        clearInterval(polling);
        polling = undefined;
      }
    };

    const handleStateUpdate = (state: ServerAdminPayload) => {
      hydrateState(state);
    };

    const handleArduinoList = (list: ServerArduinoPayload[]) => {
      setArduinos(list);
    };

    const handleGameVictory = (data: { message: string; finalTime: number }) => {
      console.log('[ADMIN] Game victory received:', data);
      setGameCompleted(true, data.finalTime);
      requestState();
    };

    const handleGameReset = () => {
      console.log('[ADMIN] Game reset received');
      setGameCompleted(false, undefined);
      requestState();
    };

    const refreshEvents = [
      'buttons:game-started',
      'module:completed',
      'module:error',
      'timer:reset',
    ] as const;

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('admin:state-update', handleStateUpdate);
    socket.on('admin:arduinos-list', handleArduinoList);
    socket.on('game:victory', handleGameVictory);
    socket.on('game:reset', handleGameReset);
    refreshEvents.forEach((event) => socket.on(event, requestState));

    return () => {
      if (polling) {
        clearInterval(polling);
        polling = undefined;
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('admin:state-update', handleStateUpdate);
      socket.off('admin:arduinos-list', handleArduinoList);
      socket.off('game:victory', handleGameVictory);
      socket.off('game:reset', handleGameReset);
      refreshEvents.forEach((event) => socket.off(event, requestState));
    };
  }, [hydrateState, setArduinos, setConnected, setGameCompleted]);
}

// Funciones de control
export function sendAdminCommand(command: string, data?: any) {
  socket.emit('admin:command', { command, data });
}

export function resetModule(moduleName: string) {
  sendAdminCommand('reset-module', { module: moduleName });
}

export function startTimer(duration: number) {
  sendAdminCommand('start-timer', { duration });
}

export function pauseTimer() {
  sendAdminCommand('pause-timer');
}

export function resumeTimer() {
  sendAdminCommand('resume-timer');
}

export function resetTimer() {
  sendAdminCommand('reset-timer');
}

export function triggerVictory() {
  sendAdminCommand('trigger-victory');
}

export function resetGame() {
  sendAdminCommand('reset-game');
  restartAllArduinos();
}

export function sendCustomEvent(
  eventName: string,
  payload: unknown,
  callback?: (result: CustomEventAck) => void
) {
  console.log(`[ADMIN] Sending custom event: ${eventName}`, payload);
  socket.emit('admin:custom-event', { eventName, payload }, (result: CustomEventAck) => {
    console.log(`[ADMIN] Custom event response:`, result);
    if (callback) callback(result);
  });
}

// Funciones de control de Arduinos
export function restartArduino(arduinoId: string) {
  socket.emit('arduino:restart', { arduinoId });
}

export function restartAllArduinos() {
  socket.emit('arduinos:restart-all');
}

// Funciones de control de módulos específicos
export function triggerButtonsGameStart() {
  sendCustomEvent('buttons:game-started', {});
}

export function triggerButtonsCompleted(code: string = '1234') {
  sendCustomEvent('buttons:completed', { code });
}

export function triggerTotemShowSixthBadge() {
  // Forzar mostrar sexta insignia sin restricciones
  sendCustomEvent('totem:force-sixth-badge', {});
}

export function triggerTotemMatchActivation(code?: string) {
  // Dispara el evento genérico que el totem está escuchando
  sendCustomEvent('connections:state-changed', { completed: true, code: code || '' });
}

export function triggerModuleCompleted(moduleId: string, code?: string) {
  sendCustomEvent('module:completed', { moduleId, code });
}

export function sendFeedbackMessage(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
  sendCustomEvent('feedback:message', { message, type });
}
