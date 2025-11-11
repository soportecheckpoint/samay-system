import axios from 'axios';
import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { gameState, updateArduino } from '../state/gameState.js';

export const sendCommandToArduino = async (
  arduinoId: string,
  command: string,
  io: Server
): Promise<boolean> => {
  const arduino = gameState.arduinos[arduinoId];

  if (!arduino) {
    logger.error(`Arduino ${arduinoId} not found`);
    return false;
  }

  const url = `http://${arduino.ip}:${arduino.port}/control`;

  try {
    logger.info(`Sending ${command} to Arduino ${arduinoId} at ${url}`);
    logger.info(`Body sending to Arduino ${arduinoId}:`, { command });

    const response = await axios.post(
      url,
      { command },
      { timeout: 10000 }
    );

    logger.info(`Arduino ${arduinoId} responded:`, response.data);

    updateArduino(arduinoId, {
      lastCommand: command,
      lastCommandTime: new Date().toISOString(),
      status: 'connected'
    });

    return true;
  } catch (error: any) {
    logger.error(`Failed to send command to Arduino ${arduinoId}:`, error.message);

    updateArduino(arduinoId, {
      status: 'error'
    });

    // Notificar a las apps del error
    io.emit('arduino:error', {
      arduinoId,
      error: error.message
    });

    return false;
  }
};

export const restartArduino = async (
  arduinoId: string,
  io: Server
): Promise<boolean> => {
  return sendCommandToArduino(arduinoId, 'restart', io);
};

export const restartAllArduinos = async (io: Server): Promise<boolean[]> => {
  const results = await Promise.all(
    Object.keys(gameState.arduinos).map(id => restartArduino(id, io))
  );
  return results;
};
