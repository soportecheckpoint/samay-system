import express from "express";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync } from "fs";
import { join } from "path";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { ScapeServer } from "./app/ScapeServer.js";
import { logger } from "./utils/logger.js";

dotenv.config();

// Add global error handlers to prevent crashes
process.on("uncaughtException", (error) => {
  logger.error(`[UNCAUGHT EXCEPTION] ${error.message}`, { stack: error.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`[UNHANDLED REJECTION] ${reason}`, { promise });
});

const app = express();

const PUBLIC_ASSETS_DIR =
  process.env.PUBLIC_ASSETS_DIR ??
  process.env.RECOGNITION_IMAGE_DIR ??
  join(process.cwd(), "public");
const rawPublicRoute = process.env.PUBLIC_ASSETS_ROUTE ?? "public";
const trimmedPublicRoute = rawPublicRoute
  .replace(/^\/+/u, "")
  .replace(/\/+$/u, "");
const PUBLIC_ASSETS_ROUTE = `/${trimmedPublicRoute || "public"}`;

// Create HTTP server for Arduino communication
const httpServer = createServer(app);

// Create HTTPS server for web clients
const httpsOptions = {
  key: readFileSync(join(process.cwd(), "../../cert/privkey1.pem")),
  cert: readFileSync(join(process.cwd(), "../../cert/cert1.pem")),
  ca: readFileSync(join(process.cwd(), "../../cert/chain1.pem")),
};
const httpsServer = createHttpsServer(httpsOptions, app);

// Socket.io server listening on both HTTP and HTTPS
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Attach Socket.io to both servers
io.attach(httpServer);
io.attach(httpsServer);

// Middleware
app.use(cors());

// Add request size validation middleware
app.use((req, res, next) => {
  const contentLength = req.headers["content-length"];
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (size > maxSize) {
      return res.status(413).json({ error: "Request entity too large" });
    }
  }
  next();
});

app.use(express.json({ limit: "15mb" }));
app.use(
  PUBLIC_ASSETS_ROUTE,
  express.static(PUBLIC_ASSETS_DIR, { index: false, maxAge: "1d" }),
);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

const scapeServer = new ScapeServer({ app, io });
scapeServer.initialize();

const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3001", 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3443", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Start HTTP server (for Arduino communication)
httpServer.listen(HTTP_PORT, HOST, () => {
  logger.info(
    `🚀 HTTP Server running on ${HOST}:${HTTP_PORT} (Arduino communication)`,
  );
});

// Start HTTPS server (for web clients)
httpsServer.listen(HTTPS_PORT, HOST, () => {
  logger.info(`🔒 HTTPS Server running on ${HOST}:${HTTPS_PORT} (Web clients)`);
  logger.info(`📡 WebSocket server ready on both HTTP and HTTPS`);
  logger.info(`🎮 Escape Room Server initialized`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing servers");
  httpServer.close(() => {
    logger.info("HTTP server closed");
  });
  httpsServer.close(() => {
    logger.info("HTTPS server closed");
  });
});

export { io };
