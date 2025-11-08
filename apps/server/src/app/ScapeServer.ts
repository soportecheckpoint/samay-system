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
import { DEVICE_MANAGER_EVENTS, SDK_EVENTS, type ResetPayload } from "@samay/scape-protocol";
import { AdminStateManager } from "../modules/adminStateManager.js";

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
  private readonly adminStateManager: AdminStateManager;

  constructor(private readonly options: ScapeServerOptions) {
    this.deviceManager = new DeviceManager(options.io, this.bus);
    this.directRouter = new DirectRouter(this.deviceManager, this.bus);
    this.storageManager = new StorageManager(options.io, this.bus);
    this.statusManager = new StatusManager(this.storageManager);
    this.monitorManager = new MonitorManager(options.io, this.bus);
    this.printerManager = new PrinterManager();
    this.arduinoBridge = new ArduinoBridge(options.app, options.io, this.bus);
    this.adminStateManager = new AdminStateManager(this.storageManager, this.bus);
  }

  initialize(): void {
    this.registerRoutes();
    this.setupSocketHandlers();
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
      socket.on(SDK_EVENTS.RESET, (payload?: ResetPayload) => {
        this.handleReset(socket, payload);
      });

      socket.emit(DEVICE_MANAGER_EVENTS.LIST, {
        devices: this.deviceManager.getSummaries()
      });
    });
  }

  private handleReset(socket: Socket, payload?: ResetPayload): void {
    const session = this.deviceManager.findBySocketId(socket.id);
    const timestamp = payload?.at ?? Date.now();
    const normalized: ResetPayload & { at: number } = {
      ...payload,
      at: timestamp,
      source: payload?.source ?? session?.id,
      sourceInstanceId: payload?.sourceInstanceId ?? session?.instanceId
    };

    logger.info(
      `[ScapeServer] Reset requested by ${normalized.source ?? "unknown"} (${normalized.sourceInstanceId ?? "n/a"})`
    );

    socket.broadcast.emit(SDK_EVENTS.RESET, normalized);

    this.statusManager.reset();
  }
}
