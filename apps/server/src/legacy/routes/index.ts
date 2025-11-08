import { Express } from 'express';
import { Server } from 'socket.io';
import { arduinoRoutes } from './arduino.js';

export const setupRoutes = (app: Express, io: Server) => {
  // Arduino routes
  arduinoRoutes(app, io);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
};
