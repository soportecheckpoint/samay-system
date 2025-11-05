import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';
import { gameState, addClient, removeClient, updateGameModule, updateArduino } from '../state/gameState.js';
import { sendCommandToArduino, restartArduino, restartAllArduinos } from '../services/arduino.js';
import {
  getTabletState,
  resetTabletState,
  updateTabletState,
  TabletStep,
} from '../state/uiState.js';
import {
  getPreviousMessage,
  setPreviousMessage,
} from '../state/previousMessage.js';
import {
  getTimerSnapshot,
  pauseTimer,
  resetTimer as resetTimerService,
  resumeTimer,
  startTimer,
  stopTimer as stopTimerService,
  subscribeToTimer,
  subscribeToTimerStop,
} from '../services/timer.js';

const ADMIN_MODULES = [
  { id: 'buttons', key: 'MODULE_BUTTONS' },
  { id: 'tablet', key: 'MODULE_TABLET' },
  { id: 'totem', key: 'MODULE_TOTEM' },
  { id: 'printer', key: 'MODULE_PRINTER' },
  { id: 'main-screen', key: 'MODULE_MAIN_SCREEN' },
] as const;

type AdminModuleId = (typeof ADMIN_MODULES)[number]['id'];
type WinOverlayVariant = 'message' | 'final';

function createAdminState() {
  const modulesSnapshot = ADMIN_MODULES.reduce(
    (acc, module) => {
      updateGameModule(module.key, {});
      const moduleState = gameState.games[module.key];

      acc[module.id] = {
        status: moduleState.status,
        lastEventTime: moduleState.lastEventTime,
        progress: moduleState.progress,
        data: moduleState.data,
      };

      return acc;
    },
    {} as Record<AdminModuleId, {
      status: string;
      lastEventTime?: string;
      progress?: number;
      data?: unknown;
    }>
  );

  const arduinosList = Object.values(gameState.arduinos)
    .map((arduino) => ({
      deviceId: arduino.id,
      status: arduino.status,
      lastHeartbeat: arduino.lastHeartbeat,
      lastCommand: arduino.lastCommand,
      lastCommandTime: arduino.lastCommandTime,
      ip: arduino.ip,
    }))
    .sort((a, b) => a.deviceId.localeCompare(b.deviceId));

  return {
    timer: {
      status: gameState.session.status,
      isRunning: gameState.session.status === 'active',
      elapsedTime: gameState.session.elapsedTime,
      remainingTime: gameState.session.remainingTime,
      totalTime: gameState.session.totalTime,
    },
    modules: modulesSnapshot,
    arduinos: arduinosList,
  };
}

function broadcastAdminState(io: Server) {
  const adminState = createAdminState();
  io.emit('admin:state-update', adminState);
  io.emit('admin:arduinos-list', adminState.arduinos);
}

function createClientState() {
  return {
    session: getTimerSnapshot(),
    tablet: getTabletState(),
  };
}

function broadcastTabletState(io: Server) {
  io.emit('tablet:state', getTabletState());
}

function broadcastClientState(io: Server) {
  io.emit('state:update', createClientState());
}

export const setupSocketHandlers = (io: Server) => {
  subscribeToTimer((snapshot) => {
    io.emit('timer:update', snapshot);
    broadcastAdminState(io);
    broadcastClientState(io);
  });

  subscribeToTimerStop((reason, snapshot) => {
    if (reason === 'reset') {
      io.emit('timer:reset', snapshot);
    } else {
      io.emit('timer:stop', {
        reason,
        finalTime: snapshot.elapsed,
      });
    }
    broadcastAdminState(io);
    broadcastClientState(io);
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Cliente se registra con su tipo de app
    socket.on('register', (data: { appType: string; sessionId: string }) => {
      addClient(socket.id, data.appType, data.sessionId);
      logger.info(`Client registered: ${data.appType} (${socket.id})`);

      // Inicializar módulo si es necesario
      if (data.appType === 'main-screen') {
        updateGameModule('MODULE_MAIN_SCREEN', {
          status: 'active',
          lastEventTime: new Date().toISOString(),
        });
        broadcastAdminState(io);
      } else if (data.appType === 'tablet-feedback') {
        updateGameModule('MODULE_TABLET', {
          status: 'active',
          lastEventTime: new Date().toISOString(),
        });
        broadcastAdminState(io);
      } else if (data.appType === 'totem-tactil') {
        updateGameModule('MODULE_TOTEM', {
          status: 'active',
          lastEventTime: new Date().toISOString(),
        });
        broadcastAdminState(io);
      } else if (data.appType === 'buttons-game') {
        updateGameModule('MODULE_BUTTONS', {
          status: 'active',
          lastEventTime: new Date().toISOString(),
        });
        broadcastAdminState(io);
      } else if (data.appType === 'ai-app') {
        updateGameModule('MODULE_PRINTER', {
          status: 'active',
          lastEventTime: new Date().toISOString(),
        });
        broadcastAdminState(io);
      }

      // Enviar estado actual
      socket.emit('state:update', createClientState());
      socket.emit('tablet:state', getTabletState());
      socket.emit('timer:update', getTimerSnapshot());

      if (data.appType === 'main-screen') {
        socket.emit('main-screen:previous-message', getPreviousMessage());
      }
    });

    // Código ingresado en algún juego (ej: botones)
    socket.on('buttons:code-entered', async (data: { code: string }) => {
      logger.info('Code entered for buttons game:', data);

      // Validar código (hardcoded por ahora)
      if (data.code === '1606') {
        // Enviar comando START al Arduino de botones
        await sendCommandToArduino('buttons-arduino', 'start', io);
        
        updateGameModule('MODULE_BUTTONS', {
          status: 'active',
          lastEventTime: new Date().toISOString()
        });

        io.emit('buttons:game-started', { status: 'active' });
        broadcastAdminState(io);
      } else {
        socket.emit('buttons:invalid-code', { message: 'Código incorrecto' });
      }
    });

    // Eventos de la tablet
    socket.on('tablet:message-selected', async (data: { messageText: string; teamName?: string }) => {
      logger.info('Tablet message selected:', data);
      const rawMessage = typeof data?.messageText === 'string' ? data.messageText : '';
      const trimmedMessage = rawMessage.trim();

      updateTabletState({
        currentStep: 'message-select',
        selectedMessage: rawMessage,
      });
      io.emit('tablet:message-selected', { messageText: rawMessage });

      if (trimmedMessage) {
        const teamNameSource =
          typeof data?.teamName === 'string' ? data.teamName : gameState.session.teamName;
        const trimmedTeamName = teamNameSource ? teamNameSource.trim() : '';
        const currentSnapshot = getPreviousMessage();

        if (
          currentSnapshot.message !== trimmedMessage ||
          currentSnapshot.teamName !== trimmedTeamName
        ) {
          const snapshot = await setPreviousMessage(trimmedMessage, trimmedTeamName);
          io.emit('main-screen:previous-message', snapshot);
        }
      }
      broadcastTabletState(io);
      broadcastClientState(io);
    });

    socket.on(
      'tablet:mirror',
      async (data: { screen: string; step: number; content?: Record<string, unknown> }) => {
        const mirrorContent = {
          screen: data?.screen ?? '',
          step: Number(data?.step) || 0,
          content: data?.content ?? {},
        };

        const nextState: Parameters<typeof updateTabletState>[0] = {
          mirror: mirrorContent,
        };

        let pendingPreviousMessage: string | null = null;

        if (mirrorContent.screen === 'feedback_form') {
          const feedbackText = String((mirrorContent.content as any)?.feedbackText ?? '');
          nextState.feedbackText = feedbackText;
        }

        if (mirrorContent.screen === 'message_selected') {
          const messageText = String((mirrorContent.content as any)?.messageText ?? '');
          nextState.selectedMessage = messageText;
          const trimmedMessage = messageText.trim();
          if (trimmedMessage) {
            pendingPreviousMessage = trimmedMessage;
          }
        }

        if (mirrorContent.screen === 'frame_message') {
          const frameMessage = String((mirrorContent.content as any)?.frameMessage ?? '');
          nextState.frameMessage = frameMessage;
        }

        updateTabletState(nextState);
        io.emit('tablet:mirror', data);
        broadcastTabletState(io);
        broadcastClientState(io);

        if (pendingPreviousMessage) {
          const currentSnapshot = getPreviousMessage();
          const trimmedTeamName = gameState.session.teamName?.trim() ?? '';
          if (
            currentSnapshot.message !== pendingPreviousMessage ||
            currentSnapshot.teamName !== trimmedTeamName
          ) {
            const snapshot = await setPreviousMessage(pendingPreviousMessage, trimmedTeamName);
            io.emit('main-screen:previous-message', snapshot);
          }
        }
      }
    );

    socket.on('tablet:frame-message', (data: { message: string; photoData?: string }) => {
      logger.info('Tablet frame message:', data);
      updateTabletState({
        frameMessage: data?.message ?? '',
        photoData: data?.photoData ?? null,
      });
      io.emit('tablet:frame-message', data);
      broadcastTabletState(io);
      broadcastClientState(io);
    });

    socket.on('tablet:step-change', (data: { step: TabletStep }) => {
      const step = data?.step;
      if (!step) {
        return;
      }

      updateTabletState({ currentStep: step });
      io.emit('tablet:step-change', { step });
      broadcastTabletState(io);
      broadcastClientState(io);
    });

    socket.on('tablet:view-change', (data: { viewId?: string }) => {
      const viewId = typeof data?.viewId === 'string' ? data.viewId : '';
      updateTabletState({ currentView: viewId });
      io.emit('tablet:view-change', { viewId });
      broadcastTabletState(io);
      broadcastClientState(io);
    });

    socket.on('tablet:reset', () => {
      const snapshot = resetTabletState();
      io.emit('tablet:reset');
      io.emit('tablet:state', snapshot);
      io.emit('tablet-feedback:reset');
      io.emit('main-screen:previous-message', getPreviousMessage());
      broadcastClientState(io);
      broadcastAdminState(io);
    });

    // Completación de módulos
    socket.on('completion', (data: { moduleId: string; code?: string; status: string }) => {
      logger.info(`Module ${data.moduleId} completed`, data);
      
      updateGameModule(data.moduleId, {
        status: 'completed',
        lastEventTime: new Date().toISOString(),
        data
      });

      io.emit('module:completed', data);
      broadcastAdminState(io);
    });

    // Errores de módulos
    socket.on('module:error', (data: { moduleId: string; errorMessage: string }) => {
      logger.error(`Error in module ${data.moduleId}: ${data.errorMessage}`);
      updateGameModule(data.moduleId, {
        status: 'error',
        lastEventTime: new Date().toISOString(),
        data,
      });
      io.emit('module:error', data);
      broadcastAdminState(io);
    });

    // Contrato aceptado (totem tactil)
    socket.on('contract:accepted', (data) => {
      logger.info('Contract accepted - stopping timer and showing victory');
      
      stopTimerService('forced');

      const snapshot = getTimerSnapshot();
      io.emit('game:victory', {
        message: '¡GANARON!',
        finalTime: snapshot.elapsed,
      });
    });

    // Totem: mensajes ordenados
    socket.on('totem:messages-ordered', (data: { messages: string[] }) => {
      logger.info('Totem messages ordered:', data);
      io.emit('totem:messages-ordered', data);
    });

    // Totem: contrato aceptado
    socket.on('totem:contract-accepted', () => {
      logger.info('Totem contract accepted');
      io.emit('totem:contract-accepted');
      
      // Detener timer y mostrar victoria
      stopTimerService('forced');
      const snapshot = getTimerSnapshot();
      io.emit('game:victory', {
        message: '¡GANARON!',
        finalTime: snapshot.elapsed,
      });
    });

    socket.on('main-screen:show-win', (data: { image?: string; variant?: WinOverlayVariant }) => {
      const image = typeof data?.image === 'string' ? data.image.trim() : '';
      if (!image) {
        return;
      }

      const variant: WinOverlayVariant = data?.variant === 'final' ? 'final' : 'message';
      io.emit('main-screen:show-win', { image, variant });
    });

    socket.on('main-screen:hide-win', () => {
      io.emit('main-screen:hide-win');
    });

    // Admin: solicitar estado
    socket.on('admin:get-state', () => {
      const adminState = createAdminState();
      socket.emit('admin:state-update', adminState);
      socket.emit('admin:arduinos-list', adminState.arduinos);
    });

    // Admin: comandos de control
    socket.on('admin:command', async (data: { command: string; data?: any }) => {
      logger.info(`Admin command: ${data.command}`, data.data);

      switch (data.command) {
        case 'start-timer': {
          const duration = Number(data.data?.duration) || 3600;
          startTimer(duration);
          broadcastClientState(io);
          break;
        }

        case 'pause-timer':
          pauseTimer();
          broadcastClientState(io);
          break;

        case 'resume-timer':
          resumeTimer();
          broadcastClientState(io);
          break;

        case 'reset-timer':
          resetTimerService();
          broadcastClientState(io);
          break;

        case 'reset-module': {
          const moduleId = String(data.data?.module ?? '').toLowerCase();
          const moduleDefinition = ADMIN_MODULES.find((module) => module.id === moduleId);
          if (moduleDefinition) {
            // Verificar si hay un cliente conectado de este tipo
            const hasConnectedClient = Object.values(gameState.clients).some((client) => {
              if (moduleDefinition.id === 'buttons') return client.appType === 'buttons-game';
              if (moduleDefinition.id === 'tablet') return client.appType === 'tablet-feedback';
              if (moduleDefinition.id === 'totem') return client.appType === 'totem-tactil';
              if (moduleDefinition.id === 'main-screen') return client.appType === 'main-screen';
              if (moduleDefinition.id === 'printer') return client.appType === 'ai-app';
              return false;
            });

            updateGameModule(moduleDefinition.key, {
              status: hasConnectedClient ? 'active' : 'waiting',
              progress: 0,
              lastEventTime: new Date().toISOString(),
              data: {},
            });
            io.emit(`${moduleDefinition.id}:reset`);
            if (moduleDefinition.id === 'tablet') {
              const snapshot = resetTabletState();
              io.emit('tablet:reset');
              io.emit('tablet:state', snapshot);
              broadcastClientState(io);
            }
            broadcastAdminState(io);
          } else {
            logger.warn(`Unknown module reset: ${data.data?.module}`);
          }
          break;
        }

        case 'trigger-victory':
          stopTimerService('forced');
          {
            const snapshot = getTimerSnapshot();
            io.emit('game:victory', {
              message: '¡GANARON!',
              finalTime: snapshot.elapsed,
            });
          }
          break;

        case 'reset-game': {
          resetTimerService();
          gameState.session.teamName = '';
          
          // Resetear módulos pero mantener active si están conectados
          ADMIN_MODULES.forEach((module) => {
            const hasConnectedClient = Object.values(gameState.clients).some((client) => {
              if (module.id === 'buttons') return client.appType === 'buttons-game';
              if (module.id === 'tablet') return client.appType === 'tablet-feedback';
              if (module.id === 'totem') return client.appType === 'totem-tactil';
              if (module.id === 'main-screen') return client.appType === 'main-screen';
              if (module.id === 'printer') return client.appType === 'ai-app';
              return false;
            });

            updateGameModule(module.key, {
              status: hasConnectedClient ? 'active' : 'waiting',
              progress: 0,
              lastEventTime: new Date().toISOString(),
              data: {},
            });
          });

          const tabletSnapshot = resetTabletState();
          io.emit('tablet:reset');
          io.emit('tablet:state', tabletSnapshot);
          io.emit('tablet-feedback:reset');
          io.emit('main-screen:previous-message', getPreviousMessage());

          const arduinoIds = Object.keys(gameState.arduinos);
          arduinoIds.forEach((arduinoId) => {
            updateArduino(arduinoId, {
              status: 'disconnected',
              lastHeartbeat: new Date().toISOString(),
              lastCommand: null,
              lastCommandTime: null,
            });
          });
          if (arduinoIds.length > 0) {
            io.emit('arduinos:reset', { deviceIds: arduinoIds });
          }
          io.emit('game:reset');
          broadcastClientState(io);
          broadcastAdminState(io);
          break;
        }

        default:
          logger.warn(`Unknown admin command: ${data.command}`);
      }
    });

    socket.on(
      'admin:custom-event',
      (
        data: { eventName?: string; payload?: unknown },
        ack?: (response: { ok: boolean; error?: string }) => void
      ) => {
        const eventName = typeof data?.eventName === 'string' ? data.eventName.trim() : '';

        if (!eventName) {
          logger.warn('Admin custom event ignored: invalid event name');
          if (ack) {
            ack({ ok: false, error: 'Nombre de evento inválido' });
          }
          return;
        }

        logger.info(`Admin custom event emitted: ${eventName}`);
        io.emit(eventName, data?.payload ?? {});

        if (ack) {
          ack({ ok: true });
        }
      }
    );

    // Comandos de Arduino - Controles individuales
    socket.on('arduino:restart', async (data: { arduinoId: string }) => {
      const arduinoId = data?.arduinoId;
      if (!arduinoId) {
        logger.warn('Arduino restart command with invalid ID');
        return;
      }
      logger.info(`Restarting Arduino: ${arduinoId}`);
      await restartArduino(arduinoId, io);
      broadcastAdminState(io);
    });

    // Comandos de Arduino - Controles globales
    socket.on('arduinos:restart-all', async () => {
      logger.info('Restarting all Arduinos');
      await restartAllArduinos(io);
      broadcastAdminState(io);
    });

    // Desconexión
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      
      // Obtener el tipo de cliente antes de removerlo
      const client = gameState.clients[socket.id];
      
      removeClient(socket.id);
      
      // Actualizar estado del módulo si es necesario
      if (client) {
        if (client.appType === 'main-screen') {
          updateGameModule('MODULE_MAIN_SCREEN', {
            status: 'waiting',
            lastEventTime: new Date().toISOString(),
          });
          broadcastAdminState(io);
        } else if (client.appType === 'tablet-feedback') {
          updateGameModule('MODULE_TABLET', {
            status: 'waiting',
            lastEventTime: new Date().toISOString(),
          });
          broadcastAdminState(io);
        } else if (client.appType === 'totem-tactil') {
          updateGameModule('MODULE_TOTEM', {
            status: 'waiting',
            lastEventTime: new Date().toISOString(),
          });
          broadcastAdminState(io);
        } else if (client.appType === 'buttons-game') {
          updateGameModule('MODULE_BUTTONS', {
            status: 'waiting',
            lastEventTime: new Date().toISOString(),
          });
          broadcastAdminState(io);
        } else if (client.appType === 'ai-app') {
          updateGameModule('MODULE_PRINTER', {
            status: 'waiting',
            lastEventTime: new Date().toISOString(),
          });
          broadcastAdminState(io);
        }
      }
    });
  });
};
