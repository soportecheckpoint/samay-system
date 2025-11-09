import type { Express, Request, Response } from "express";
import { DEVICE, type DeviceId } from "@samay/scape-protocol";
import type { Server } from "socket.io";
import { ServerEventBus, SERVER_EVENTS } from "../app/events.js";
import { logger } from "../utils/logger.js";
import type { DeviceManager } from "./deviceManager.js";
import type { DirectRouter } from "./directRouter.js";
import axios from "axios";

interface ArduinoSession {
  id: string;
  ip: string;
  port: number;
  connectedAt: string;
  lastHeartbeat: string;
  status: "connected" | "disconnected" | "error";
}

export class ArduinoBridge {
  private readonly sessions = new Map<string, ArduinoSession>();

  constructor(
    private readonly app: Express,
    private readonly io: Server,
    private readonly bus: ServerEventBus,
    private readonly deviceManager: DeviceManager
  ) {}

  setDirectRouter(directRouter: DirectRouter): void {
    this.directRouter = directRouter;
  }

  private directRouter?: DirectRouter;

  register(): void {
    // POST /connect - Arduino se registra
    this.app.post("/connect", async (req: Request, res: Response) => {
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

      // Registrar en DeviceManager simulando un dispositivo HTTP
      this.deviceManager.registerHttpDevice({
        device: id as DeviceId,
        instanceId: id,
        transport: "http",
        metadata: {
          kind: "hardware",
          port,
          arduinoType: id
        },
        ip
      });

      this.bus.emit(SERVER_EVENTS.HARDWARE_HEARTBEAT, {
        device: id as DeviceId,
        instanceId: id,
        at: Date.now(),
        ip,
        metadata: { port }
      });

      // Iniciar sondeo de latencia HTTP cada 10 segundos
      const baseUrl = `http://${ip}:${port}`;
      this.deviceManager.startHttpLatencyProbe(id, baseUrl, 5_000);

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

      // Si el Arduino es buttons-arduino y envía estado de botones,
      // reenviar al buttons-game usando el comando set-state
      if (arduinoId === DEVICE.BUTTONS_ARDUINO && data && Array.isArray(data.buttons)) {
        this.forwardButtonStateToGame(data);
      }

      // Si el Arduino de connections completa, iniciar totem fase 1
      if (arduinoId === "connections" && data && data.completed === true) {
        this.triggerTotemStart(1, "connections-completed");
      }

      // Si el Arduino de rfid completa, iniciar totem fase 2
      if (arduinoId === "rfid" && data && data.completed === true) {
        this.triggerTotemStart(2, "rfid-completed");
      }

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

        // Actualizar actividad en DeviceManager
        this.deviceManager.updateHttpDeviceActivity(arduinoId);

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

    // GET /pong - Arduino responde al ping con el timestamp original
    this.app.get("/pong", (req: Request, res: Response) => {
      const { arduinoId, time } = req.query;

      if (!arduinoId || !time) {
        return res.status(400).json({ error: "Missing arduinoId or time" });
      }

      const sentTimestamp = parseInt(time as string, 10);
      if (isNaN(sentTimestamp)) {
        return res.status(400).json({ error: "Invalid timestamp" });
      }

      // Calcular latencia basándose en el timestamp enviado
      this.deviceManager.handleHttpPong(arduinoId as string, sentTimestamp);

      res.json({
        status: "pong",
        receivedAt: Date.now()
      });
    });
  }

  async sendCommandToArduino(arduinoId: string, command: "start" | "restart"): Promise<void> {
    const session = this.sessions.get(arduinoId);
    
    if (!session) {
      throw new Error(`Arduino ${arduinoId} not found in sessions`);
    }

    const url = `http://${session.ip}:${session.port}/control`;

    try {
      logger.info(`[ArduinoBridge] Sending command "${command}" to Arduino ${arduinoId} at ${url}`);

      const response = await axios.post(
        url,
        { command },
        { timeout: 5000 }
      );

      logger.info(`[ArduinoBridge] Arduino ${arduinoId} responded:`, response.data);

      // Actualizar última acción en el dispositivo
      this.bus.emit(SERVER_EVENTS.HARDWARE_EVENT, {
        device: arduinoId as DeviceId,
        instanceId: arduinoId,
        at: Date.now(),
        event: `arduino:command:${command}`,
        payload: { command, response: response.data },
        ip: session.ip
      });

    } catch (error: any) {
      logger.error(
        `[ArduinoBridge] Failed to send command "${command}" to Arduino ${arduinoId}: ${error.message}`
      );

      session.status = "error";
      this.sessions.set(arduinoId, session);

      this.io.emit("arduino:error", {
        arduinoId,
        command,
        error: error.message
      });

      throw error;
    }
  }

  private forwardButtonStateToGame(data: { buttons: any[]; completed?: boolean }): void {
    if (!this.directRouter) {
      logger.warn("[ArduinoBridge] DirectRouter not set, cannot forward button state to game");
      return;
    }

    logger.info(
      `[ArduinoBridge] Forwarding button state to ${DEVICE.BUTTONS_APP}: ${data.buttons.length} buttons, completed: ${data.completed ?? false}`
    );

    // Enviar comando set-state al buttons-game
    this.directRouter.send(
      DEVICE.BUTTONS_APP,
      "setState",
      {
        buttons: data.buttons,
        completed: data.completed
      },
      {
        source: DEVICE.BUTTONS_ARDUINO,
        sourceInstanceId: DEVICE.BUTTONS_ARDUINO
      }
    );
  }

  private triggerTotemStart(phase: 1 | 2, reason: string): void {
    if (!this.directRouter) {
      logger.warn("[ArduinoBridge] DirectRouter not set, cannot trigger totem start");
      return;
    }

    logger.info(`[ArduinoBridge] Triggering totem start phase ${phase} (reason: ${reason})`);

    // Enviar comando start al totem con la fase específica
    this.directRouter.send(
      DEVICE.TOTEM,
      "start",
      { phase },
      {
        source: reason as DeviceId,
        sourceInstanceId: reason
      }
    );
  }
}
