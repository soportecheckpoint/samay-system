import type { Socket } from "socket.io-client";
import {
  MONITOR_EVENTS,
  type MonitorEventPayload,
  type MonitorHeartbeatPayload,
  type MonitorHistoryPayload
} from "@samay/scape-protocol";
import type { MonitorModule } from "../types.js";

export class MonitorModuleImpl implements MonitorModule {
  private readonly socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  onEvent(handler: (payload: MonitorEventPayload) => void): () => void {
    this.socket.on(MONITOR_EVENTS.STREAM, handler);
    return () => this.socket.off(MONITOR_EVENTS.STREAM, handler);
  }

  onHeartbeat(handler: (payload: MonitorHeartbeatPayload) => void): () => void {
    this.socket.on(MONITOR_EVENTS.HEARTBEAT, handler);
    return () => this.socket.off(MONITOR_EVENTS.HEARTBEAT, handler);
  }

  onHistory(handler: (payload: MonitorHistoryPayload) => void): () => void {
    this.socket.on(MONITOR_EVENTS.HISTORY, handler);
    return () => this.socket.off(MONITOR_EVENTS.HISTORY, handler);
  }
}
