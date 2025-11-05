import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { gameState, updateArduino } from '../state/gameState.js';

const HEARTBEAT_TIMEOUT = parseInt(process.env.ARDUINO_TIMEOUT || '30000');

export const startHeartbeatMonitor = (io: Server) => {
  setInterval(() => {
    const now = Date.now();

    Object.values(gameState.arduinos).forEach((arduino) => {
      const lastHeartbeat = new Date(arduino.lastHeartbeat).getTime();
      const timeSinceLastHeartbeat = now - lastHeartbeat;

      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT && arduino.status === 'connected') {
        logger.warn(`Arduino ${arduino.id} heartbeat timeout`);

        updateArduino(arduino.id, {
          status: 'disconnected'
        });

        // Notificar a todas las apps
        io.emit('arduino:disconnected', {
          arduinoId: arduino.id,
          message: `Arduino ${arduino.id} disconnected (no heartbeat)`
        });
      }
    });
  }, 10000); // Check every 10 seconds
};
