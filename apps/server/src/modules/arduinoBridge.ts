import type { Express, Request, Response } from "express";
import type { DeviceId } from "@samay/scape-protocol";
import type { Server } from "socket.io";
import { ServerEventBus, SERVER_EVENTS } from "../app/events.js";
import { logger } from "../utils/logger.js";

interface ArduinoSession {
  id: string;
  ip: string;
  port: number;
  connectedAt: string;
  lastHeartbeat: string;
  status: "connected" | "disconnected";
}

export class ArduinoBridge {
  private readonly sessions = new Map<string, ArduinoSession>();

  constructor(
    private readonly app: Express,
    private readonly io: Server,
    private readonly bus: ServerEventBus
  ) {}

  register(): void {
    // POST /connect - Arduino se registra
    this.app.post("/connect", (req: Request, res: Response) => {
      const { id, ip, port } = req.body;

      if (!id || !ip) {
        return res.status(400).json({ error: "Missing id or ip" });
      }

      const now = new Date().toISOString();
      const session: ArduinoSession = {
        id,
        ip,
        port: port || 8080,
        connectedAt: now,
        lastHeartbeat: now,
        status: "connected"
      };

      this.sessions.set(id, session);
      logger.info(`[ArduinoBridge] Arduino connected: ${id} (${ip}:${port})`);

      this.bus.emit(SERVER_EVENTS.HARDWARE_HEARTBEAT, {
        device: id as DeviceId,
        instanceId: id,
        at: Date.now(),
        ip,
        metadata: { port }
      });

      res.json({
        status: "registered",
        arduinoId: id,
        message: "Arduino registrado exitosamente"
      });
    });

    // POST /dispatch - Arduino envía eventos
    this.app.post("/dispatch", (req: Request, res: Response) => {
      const { arduinoId, event, data } = req.body;

      if (!arduinoId || !event) {
        return res.status(400).json({ error: "Missing arduinoId or event" });
      }

      logger.info(`[ArduinoBridge] Event from Arduino ${arduinoId}: ${event}`, data);

      // Distribuir evento a todas las apps React conectadas vía Socket.io
      this.io.emit(event, data);

      this.bus.emit(SERVER_EVENTS.HARDWARE_EVENT, {
        device: arduinoId as DeviceId,
        instanceId: arduinoId,
        at: Date.now(),
        event,
        payload: data,
        ip: this.sessions.get(arduinoId)?.ip
      });

      res.json({
        status: "received",
        message: "Evento procesado"
      });
    });

    // POST /heartbeat - Monitoreo de salud del Arduino
    this.app.post("/heartbeat", (req: Request, res: Response) => {
      const { arduinoId, timestamp } = req.body;

      if (!arduinoId) {
        return res.status(400).json({ error: "Missing arduinoId" });
      }

      const session = this.sessions.get(arduinoId);
      if (session) {
        session.lastHeartbeat = new Date().toISOString();
        session.status = "connected";
        this.sessions.set(arduinoId, session);

        this.bus.emit(SERVER_EVENTS.HARDWARE_HEARTBEAT, {
          device: arduinoId as DeviceId,
          instanceId: arduinoId,
          at: Date.now(),
          ip: session.ip
        });
      }

      res.json({
        status: "alive",
        timestamp: new Date().toISOString()
      });
    });
  }
}
