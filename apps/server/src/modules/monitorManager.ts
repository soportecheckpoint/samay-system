import {
  MONITOR_EVENTS,
  type MonitorEventPayload,
  type MonitorHeartbeatPayload,
  type MonitorHistoryPayload
} from "@samay/scape-protocol";
import type { Server, Socket } from "socket.io";
import { SERVER_EVENTS, ServerEventBus } from "../app/events.js";

const MAX_HISTORY = 200;

export class MonitorManager {
  private readonly history: MonitorEventPayload[] = [];
  private readonly watchers = new Map<string, Socket>();

  constructor(
    private readonly io: Server,
    private readonly bus: ServerEventBus
  ) {
    this.bus.on(SERVER_EVENTS.DIRECT_EXECUTED, ({ envelope, eventName }) => {
      if (!envelope.source) {
        return;
      }

      const payload: MonitorEventPayload = {
        at: Date.now(),
        source: envelope.source,
        target: envelope.target,
        channel: eventName,
        detail: typeof envelope.payload === "object" && envelope.payload
          ? { ...((envelope.payload as Record<string, unknown>) ?? {}) }
          : undefined
      };

      this.recordEvent(payload);
    });

    this.bus.on(SERVER_EVENTS.DEVICE_HEARTBEAT, (payload) => {
      const heartbeat: MonitorHeartbeatPayload = {
        device: payload.device,
        instanceId: payload.instanceId,
        latencyMs: payload.latencyMs,
        at: payload.at
      };
      this.broadcastHeartbeat(heartbeat);
    });
  }

  attach(socket: Socket): void {
    socket.on("monitor:subscribe", () => {
      this.watchers.set(socket.id, socket);
      this.sendHistory(socket);
    });

    socket.on("monitor:unsubscribe", () => {
      this.watchers.delete(socket.id);
    });

    socket.on("disconnect", () => {
      this.watchers.delete(socket.id);
    });
  }

  private recordEvent(payload: MonitorEventPayload): void {
    this.history.push(payload);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    this.broadcastEvent(payload);
  }

  private sendHistory(socket: Socket): void {
    const history: MonitorHistoryPayload = {
      events: [...this.history]
    };

    socket.emit(MONITOR_EVENTS.HISTORY, history);
  }

  private broadcastEvent(payload: MonitorEventPayload): void {
    for (const watcher of this.watchers.values()) {
      watcher.emit(MONITOR_EVENTS.STREAM, payload);
    }

    this.bus.emit(SERVER_EVENTS.MONITOR_EVENT, payload);
  }

  private broadcastHeartbeat(payload: MonitorHeartbeatPayload): void {
    for (const watcher of this.watchers.values()) {
      watcher.emit(MONITOR_EVENTS.HEARTBEAT, payload);
    }

    this.bus.emit(SERVER_EVENTS.MONITOR_HEARTBEAT, payload);
  }
}
