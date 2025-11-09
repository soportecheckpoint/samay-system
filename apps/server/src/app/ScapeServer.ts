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
import { DEVICE_MANAGER_EVENTS, SDK_EVENTS, type DeviceId, type ResetPayload } from "@samay/scape-protocol";
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
    this.arduinoBridge = new ArduinoBridge(options.app, options.io, this.bus, this.deviceManager);
    this.adminStateManager = new AdminStateManager(this.storageManager, this.bus);
    
    // Conectar ArduinoBridge con DirectRouter (bidireccional)
    this.directRouter.setArduinoBridge(this.arduinoBridge);
    this.arduinoBridge.setDirectRouter(this.directRouter);
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

    const targets = this.extractResetTargets(normalized.metadata);

    if (targets.length === 0) {
      logger.info(
        `[ScapeServer] Global reset requested by ${normalized.source ?? "unknown"} (${normalized.sourceInstanceId ?? "n/a"})`
      );

      socket.broadcast.emit(SDK_EVENTS.RESET, normalized);
      this.statusManager.reset();
      
      // Enviar restart a todos los Arduinos conectados
      this.restartAllArduinos();
      
      return;
    }

    const dispatched = this.dispatchTargetedReset(normalized, targets, session?.id, session?.instanceId);

    if (dispatched === 0) {
      logger.warn(
        `[ScapeServer] Targeted reset requested but no recipients found for ${targets
          .map((target) => `${target.device}${target.instanceId ? `@${target.instanceId}` : ""}`)
          .join(", ")}`
      );
      return;
    }

    logger.info(
      `[ScapeServer] Reset requested by ${normalized.source ?? "unknown"} (${normalized.sourceInstanceId ?? "n/a"}) targeting ${targets
        .map((target) => `${target.device}${target.instanceId ? `@${target.instanceId}` : ""}`)
        .join(", ")}`
    );
  }

  private extractResetTargets(metadata?: Record<string, unknown> | null): Array<{ device: DeviceId; instanceId?: string }> {
    if (!metadata) {
      return [];
    }

  const container = metadata as { targets?: unknown };
  const raw = container.targets;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const targets: Array<{ device: DeviceId; instanceId?: string }> = [];

    for (const entry of list) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const device = this.pickDeviceId(entry);
      if (!device) {
        continue;
      }

      const instanceId = this.pickInstanceId(entry);
      targets.push({ device, instanceId });
    }

    return targets;
  }

  private pickDeviceId(entry: unknown): DeviceId | null {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const { device, deviceId } = entry as { device?: unknown; deviceId?: unknown };
    if (typeof device === "string" && device.trim().length > 0) {
      return device;
    }

    if (typeof deviceId === "string" && deviceId.trim().length > 0) {
      return deviceId;
    }

    return null;
  }

  private pickInstanceId(entry: unknown): string | undefined {
    if (!entry || typeof entry !== "object") {
      return undefined;
    }

    const candidate = (entry as { instanceId?: unknown }).instanceId;
    return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : undefined;
  }

  private dispatchTargetedReset(
    payload: ResetPayload & { at: number },
    targets: Array<{ device: DeviceId; instanceId?: string }>,
    sourceDevice?: DeviceId,
    sourceInstanceId?: string
  ): number {
    const delivered = new Set<string>();

    for (const target of targets) {
      const sessions = this.deviceManager.getDeviceSessions(target.device);
      const recipients = target.instanceId
        ? sessions.filter((session) => session.instanceId === target.instanceId)
        : sessions;

      for (const recipient of recipients) {
        const key = `${recipient.id}:${recipient.instanceId}`;
        if (delivered.has(key)) {
          continue;
        }

        if (
          sourceDevice &&
          sourceInstanceId &&
          recipient.id === sourceDevice &&
          recipient.instanceId === sourceInstanceId
        ) {
          continue;
        }

        delivered.add(key);
        recipient.socket.emit(SDK_EVENTS.RESET, payload);
      }
    }

    return delivered.size;
  }

  private restartAllArduinos(): void {
    // Obtener todos los dispositivos con transport="http" (Arduinos)
    const allDevices = this.deviceManager.getSummaries();
    const arduinos = allDevices.filter((device) => device.transport === "http");

    if (arduinos.length === 0) {
      logger.info("[ScapeServer] No Arduinos connected to restart");
      return;
    }

    logger.info(`[ScapeServer] Restarting ${arduinos.length} Arduino(s)`);

    for (const arduino of arduinos) {
      this.arduinoBridge
        .sendCommandToArduino(arduino.device, "restart")
        .then(() => {
          logger.info(`[ScapeServer] Restart command sent to Arduino: ${arduino.device}`);
        })
        .catch((error: Error) => {
          logger.error(`[ScapeServer] Failed to restart Arduino ${arduino.device}: ${error.message}`);
        });
    }
  }
}
