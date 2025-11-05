import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupRoutes } from './routes/index.js';
import { setupSocketHandlers } from './socket/index.js';
import { logger } from './utils/logger.js';
import { gameState } from './state/gameState.js';
import { startHeartbeatMonitor } from './services/heartbeat.js';
import { initPreviousMessageStore } from './state/previousMessage.js';

dotenv.config();

await initPreviousMessageStore();

const app = express();

// Create HTTP server for Arduino communication
const httpServer = createServer(app);

// Create HTTPS server for web clients
const httpsOptions = {
  key: readFileSync(join(process.cwd(), '../../cert/privkey1.pem')),
  cert: readFileSync(join(process.cwd(), '../../cert/cert1.pem')),
  ca: readFileSync(join(process.cwd(), '../../cert/chain1.pem'))
};
const httpsServer = createHttpsServer(httpsOptions, app);

// Socket.io server listening on both HTTP and HTTPS
const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Socket.io to both servers
io.attach(httpServer);
io.attach(httpsServer);

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Setup routes for Arduino communication
setupRoutes(app, io);

// Setup WebSocket handlers for React apps
setupSocketHandlers(io);

// Start heartbeat monitor for Arduinos
startHeartbeatMonitor(io);

const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3443', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Start HTTP server (for Arduino communication)
httpServer.listen(HTTP_PORT, HOST, () => {
  logger.info(`🚀 HTTP Server running on ${HOST}:${HTTP_PORT} (Arduino communication)`);
});

// Start HTTPS server (for web clients)
httpsServer.listen(HTTPS_PORT, HOST, () => {
  logger.info(`🔒 HTTPS Server running on ${HOST}:${HTTPS_PORT} (Web clients)`);
  logger.info(`📡 WebSocket server ready on both HTTP and HTTPS`);
  logger.info(`🎮 Escape Room Server initialized`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing servers');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  httpsServer.close(() => {
    logger.info('HTTPS server closed');
  });
});

export { io };
