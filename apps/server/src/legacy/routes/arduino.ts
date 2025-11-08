import { Express, Request, Response } from 'express';
import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { gameState, updateArduino, updateGameModule } from '../state/gameState.js';

export const arduinoRoutes = (app: Express, io: Server) => {
  // POST /connect - Arduino se registra
  app.post('/connect', (req: Request, res: Response) => {
    const { id, ip, port } = req.body;

    if (!id || !ip) {
      return res.status(400).json({ error: 'Missing id or ip' });
    }

    updateArduino(id, {
      id,
      ip,
      port: port || 8080,
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      status: 'connected'
    });

    logger.info(`Arduino connected: ${id} (${ip}:${port})`);

    res.json({
      status: 'registered',
      arduinoId: id,
      message: 'Arduino registrado exitosamente'
    });
  });

  // POST /dispatch - Arduino envía eventos
  app.post('/dispatch', (req: Request, res: Response) => {
    const { arduinoId, event, data } = req.body;

    if (!arduinoId || !event) {
      return res.status(400).json({ error: 'Missing arduinoId or event' });
    }

    logger.info(`Event from Arduino ${arduinoId}: ${event}`, data);

    // Distribuir evento a todas las apps React conectadas
    io.emit(event, data);

    // Actualizar estado del juego si es necesario
    if (event.includes('state-changed')) {
      const moduleId = `MODULE_${arduinoId.toUpperCase()}`;
      updateGameModule(moduleId, {
        lastEventTime: new Date().toISOString(),
        data
      });

      // Si el juego está completado
      if (data.completed) {
        updateGameModule(moduleId, { status: 'completed' });
      }
    }

    res.json({
      status: 'received',
      message: 'Evento procesado'
    });
  });

  // POST /heartbeat - Monitoreo de salud del Arduino
  app.post('/heartbeat', (req: Request, res: Response) => {
    const { arduinoId, timestamp } = req.body;

    if (!arduinoId) {
      return res.status(400).json({ error: 'Missing arduinoId' });
    }

    if (gameState.arduinos[arduinoId]) {
      updateArduino(arduinoId, {
        lastHeartbeat: new Date().toISOString(),
        status: 'connected'
      });
    }

    res.json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });
};
