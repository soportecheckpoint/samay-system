import type { Socket } from "socket.io-client";
import {
  MONITOR_EVENTS,
  type MonitorEventPayload,
  type MonitorLatencyPayload,
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

  onLatency(handler: (payload: MonitorLatencyPayload) => void): () => void {
    this.socket.on(MONITOR_EVENTS.LATENCY, handler);
    return () => this.socket.off(MONITOR_EVENTS.LATENCY, handler);
  }

  onHistory(handler: (payload: MonitorHistoryPayload) => void): () => void {
    this.socket.on(MONITOR_EVENTS.HISTORY, handler);
    return () => this.socket.off(MONITOR_EVENTS.HISTORY, handler);
  }
}
