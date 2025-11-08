import type { Express, Request, Response } from "express";
import { DEVICE, type DeviceId } from "@samay/scape-protocol";
import { ServerEventBus, SERVER_EVENTS } from "../app/events.js";
import type { DirectRouter } from "./directRouter.js";
import { logger } from "../utils/logger.js";

interface ArduinoSession {
  device: DeviceId;
  instanceId: string;
  lastHeartbeat: number;
  metadata?: Record<string, unknown>;
}

const DEFAULT_INSTANCE = "hardware";

export class ArduinoBridge {
  private readonly sessions = new Map<DeviceId, ArduinoSession>();

  constructor(
    private readonly app: Express,
    private readonly directRouter: DirectRouter,
    private readonly bus: ServerEventBus
  ) {}

  register(): void {
    this.app.post("/api/arduino/:device/heartbeat", (req: Request, res: Response) => {
      const device = this.resolveDevice(req.params.device);
      if (!device) {
        res.status(400).json({ error: "Unknown device" });
        return;
      }

      const instanceId = this.resolveInstanceId(req.body?.instanceId);
      const now = Date.now();
      const session: ArduinoSession = {
        device,
        instanceId,
        lastHeartbeat: now,
        metadata: typeof req.body?.metadata === "object" ? req.body.metadata : undefined
      };

      this.sessions.set(device, session);
      logger.info(`[ArduinoBridge] Heartbeat from ${device} (${instanceId})`);

      this.bus.emit(SERVER_EVENTS.MONITOR_HEARTBEAT, {
        device,
        instanceId,
        latencyMs: req.body?.latencyMs,
        at: now
      });

      res.json({ ok: true, at: now });
    });

    this.app.post("/api/arduino/:device/event", async (req: Request, res: Response) => {
      const device = this.resolveDevice(req.params.device);
      if (!device) {
        res.status(400).json({ error: "Unknown device" });
        return;
      }

      const { target, command, payload } = req.body ?? {};
      if (!target || !command) {
        res.status(400).json({ error: "Missing target or command" });
        return;
      }

      const targetDevice = this.isDeviceId(target) ? target : null;
      if (!targetDevice) {
        res.status(400).json({ error: "Unknown target" });
        return;
      }

      try {
        const delivered = this.directRouter.send(targetDevice, command, payload, {
          source: device,
          sourceInstanceId: this.resolveInstanceId(req.body?.instanceId ?? DEFAULT_INSTANCE)
        });

        res.json({ ok: true, delivered });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[ArduinoBridge] Failed to forward event from ${device}: ${message}`);
        res.status(500).json({ ok: false, error: message });
      }
    });
  }

  private resolveDevice(value: string | undefined): DeviceId | null {
    if (!value) {
      return null;
    }

    return Object.values(DEVICE).find((id) => id === value) ?? null;
  }

  private resolveInstanceId(value: unknown): string {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    return DEFAULT_INSTANCE;
  }

  private isDeviceId(value: unknown): value is DeviceId {
    if (typeof value !== "string") {
      return false;
    }
    return Object.values(DEVICE).includes(value as DeviceId);
  }
}
