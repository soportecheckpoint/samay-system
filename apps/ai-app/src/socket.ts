import { useEffect } from 'react';
import { io } from 'socket.io-client';
import useViewStore from './view-manager/view-manager-store';
import { useAiStore } from './store';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export function useSocket() {
  const resetFlow = useViewStore((state) => state.resetFlow);
  const reset = useAiStore((state: any) => state.reset);

  useEffect(() => {
    const handleConnect = () => {
      console.log('[AI-APP] Conectado al servidor');
      socket.emit('register', {
        appType: 'ai-app',
        sessionId: 'AI_SESSION',
      });
    };

    const handleDisconnect = () => {
      console.log('[AI-APP] Desconectado del servidor');
    };

    // Escuchar reset del módulo printer (ai-app)
    const handlePrinterReset = () => {
      console.log('[AI-APP] Reset del módulo recibido');
      reset();
      resetFlow('home');
    };

    // Escuchar reset general
    const handleGameReset = () => {
      console.log('[AI-APP] Reset general recibido');
      reset();
      resetFlow('home');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('printer:reset', handlePrinterReset);
    socket.on('game:reset', handleGameReset);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('printer:reset', handlePrinterReset);
      socket.off('game:reset', handleGameReset);
    };
  }, [resetFlow, reset]);
}

// Función para enviar evento de impresión de PDF
export function printPDF() {
  console.log('[AI-APP] Solicitando impresión de PDF');
  socket.emit('ai:print-pdf', {
    timestamp: new Date().toISOString(),
  });
}

// Función para notificar código correcto
export function notifyCodeCorrect() {
  console.log('[AI-APP] Notificando código correcto');
  socket.emit('ai:code-correct', {
    timestamp: new Date().toISOString(),
  });
}

// Función para notificar selector correcto
export function notifySelectorCorrect() {
  console.log('[AI-APP] Notificando selector correcto');
  socket.emit('ai:selector-correct', {
    timestamp: new Date().toISOString(),
  });
}

// Función para notificar finalización del módulo
export function notifyModuleCompleted() {
  console.log('[AI-APP] Notificando módulo completado');
  socket.emit('module:completed', {
    moduleId: 'ai',
    timestamp: new Date().toISOString(),
  });
}
