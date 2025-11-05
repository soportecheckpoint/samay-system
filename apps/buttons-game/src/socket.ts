import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from './store';
import useViewStore from './view-manager/view-manager-store';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const useSocket = () => {
  const { updateButtons, setError, resetGame } = useGameStore();
  const { setView, resetFlow, resetCode } = useViewStore();

  useEffect(() => {
    if (!socket) {
      socket = io(SERVER_URL);

      socket.on('connect', () => {
        console.log('Connected to server');
        socket?.emit('register', { appType: 'buttons-game', sessionId: 'SESSION_001' });
      });

      // Estado de botones actualizado desde Arduino
      socket.on('buttons:state-changed', (data: { buttons: any[]; completed?: boolean }) => {
        console.log('Buttons state changed:', data);
        updateButtons(data.buttons);

        if (data.completed) {
          const { currentView } = useViewStore.getState();

          if (currentView !== 'message') {
            console.log('Buttons sequence completed via state change');
            setView('message');
          }
        }
      });

      // Juego iniciado
      socket.on('buttons:game-started', () => {
        console.log('Game started');
        setView('mesa');
        setError('');
      });

      // Código inválido
      socket.on('buttons:invalid-code', (data: { message: string }) => {
        console.log('Invalid code:', data);
        setError(data.message);
      });

      // Juego completado - Este es el evento que envía el Arduino cuando se completa la secuencia
      socket.on('buttons:completed', () => {
        console.log('Game completed - Arduino sent completion signal');
        setView('message');
      });

      // Reset específico del módulo de botones
      socket.on('buttons:reset', () => {
        console.log('Buttons module reset received');
        resetGame();
        resetFlow('code');
        // Also clear any entered code
        resetCode();
      });

      // Reset general del juego
      socket.on('game:reset', () => {
        console.log('General game reset received');
        resetGame();
        resetFlow('code');
        // Also clear any entered code
        resetCode();
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [updateButtons, setError, resetGame, setView, resetFlow]);

  return socket;
};

export const sendCodeToServer = (code: string) => {
  if (socket) {
    socket.emit('buttons:code-entered', { code });
  }
};
