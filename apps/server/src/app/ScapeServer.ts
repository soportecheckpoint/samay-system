import type { Express } from "express";
import type { Server, Socket } from "socket.io";
import { ServerEventBus } from "./events.js";
import { DeviceManager } from "../modules/deviceManager.js";
import { DirectRouter } from "../modules/directRouter.js";
import { StorageManager } from "../modules/storageManager.js";
import { StatusManager } from "../modules/statusManager.js";
import { MonitorManager } from "../modules/monitorManager.js";
import { PrinterManager } from "../modules/printerManager.js";
import { ArduinoBridge } from "../modules/arduinoBridge.js";
import { createRecognitionRouter } from "../routes/recognitionRouter.js";
import { logger } from "../utils/logger.js";
import { DEVICE_MANAGER_EVENTS } from "@samay/scape-protocol";

export interface ScapeServerOptions {
  app: Express;
  io: Server;
}

export class ScapeServer {
  private readonly bus = new ServerEventBus();
  private readonly deviceManager: DeviceManager;
  private readonly directRouter: DirectRouter;
  private readonly storageManager: StorageManager;
  private readonly statusManager: StatusManager;
  private readonly monitorManager: MonitorManager;
  private readonly printerManager: PrinterManager;
  private readonly arduinoBridge: ArduinoBridge;

  constructor(private readonly options: ScapeServerOptions) {
  this.deviceManager = new DeviceManager(options.io, this.bus);
  this.directRouter = new DirectRouter(this.deviceManager, this.bus);
    this.storageManager = new StorageManager(options.io, this.bus);
    this.statusManager = new StatusManager(this.storageManager);
    this.monitorManager = new MonitorManager(options.io, this.bus);
    this.printerManager = new PrinterManager();
  this.arduinoBridge = new ArduinoBridge(options.app, this.directRouter, this.bus);
  }

  initialize(): void {
    this.registerRoutes();
    this.setupSocketHandlers();
    this.bootstrapStorage();
  }

  private registerRoutes(): void {
    const { app } = this.options;

    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

  app.use("/api/recognition", createRecognitionRouter());

  this.arduinoBridge.register();
  }

  private setupSocketHandlers(): void {
    this.options.io.on("connection", (socket: Socket) => {
      logger.info(`[Socket] Connected: ${socket.id}`);

      this.deviceManager.attach(socket);
      this.directRouter.attach(socket);
      this.storageManager.attach(socket);
      this.statusManager.attach(socket);
      this.monitorManager.attach(socket);
      this.printerManager.attach(socket);

      socket.emit(DEVICE_MANAGER_EVENTS.LIST, {
        devices: this.deviceManager.getSummaries()
      });
    });
  }

  private bootstrapStorage(): void {
    const snapshot = this.storageManager.getState();
    const patch: Record<string, unknown> = {};

    if (!snapshot.status) {
      patch.status = {
        phase: "idle",
        updatedAt: Date.now()
      };
    }

    if (!snapshot.timer) {
      patch.timer = {
        totalMs: 60 * 60 * 1000,
        remainingMs: 60 * 60 * 1000,
        startedAt: null,
        phase: "idle"
      };
    }

    if (Object.keys(patch).length > 0) {
      this.storageManager.patch(patch);
    }
  }
}
