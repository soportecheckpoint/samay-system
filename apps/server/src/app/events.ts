import { EventEmitter } from "events";
import type {
  DirectExecuteEnvelope,
  DeviceConnectionSnapshot,
  DeviceId,
  DeviceLatencyPayload,
  MonitorEventPayload,
  MonitorLatencyPayload,
  StorageUpdatePayload
} from "@samay/scape-protocol";

export const SERVER_EVENTS = {
  DEVICE_REGISTERED: "device:registered",
  DEVICE_UNREGISTERED: "device:unregistered",
  DEVICE_DISCONNECTED: "device:disconnected",
  DEVICE_LIST_CHANGED: "device:list",
  DEVICE_LATENCY: "device:latency",
  DIRECT_EXECUTED: "direct:executed",
  MONITOR_EVENT: "monitor:event",
  MONITOR_LATENCY: "monitor:latency",
  STORAGE_UPDATED: "storage:updated",
  HARDWARE_HEARTBEAT: "hardware:heartbeat",
  HARDWARE_EVENT: "hardware:event"
} as const;

type ServerEventMap = {
  [SERVER_EVENTS.DEVICE_REGISTERED]: DeviceConnectionSnapshot;
  [SERVER_EVENTS.DEVICE_UNREGISTERED]: DeviceConnectionSnapshot;
  [SERVER_EVENTS.DEVICE_DISCONNECTED]: {
    id: DeviceId;
    instanceId: string;
    disconnectedAt: number;
    ip?: string;
    transport: string;
    metadata?: Record<string, unknown>;
    connectionHistory: Array<{
      connectedAt: number;
      disconnectedAt?: number;
      duration?: number;
    }>;
  };
  [SERVER_EVENTS.DEVICE_LIST_CHANGED]: DeviceConnectionSnapshot[];
  [SERVER_EVENTS.DEVICE_LATENCY]: DeviceLatencyPayload & {
    at: number;
  };
  [SERVER_EVENTS.DIRECT_EXECUTED]: {
    envelope: DirectExecuteEnvelope;
    eventName: string;
    recipients: DeviceConnectionSnapshot[];
  };
  [SERVER_EVENTS.MONITOR_EVENT]: MonitorEventPayload;
  [SERVER_EVENTS.MONITOR_LATENCY]: MonitorLatencyPayload;
  [SERVER_EVENTS.STORAGE_UPDATED]: StorageUpdatePayload;
  [SERVER_EVENTS.HARDWARE_HEARTBEAT]: {
    device: DeviceId;
    instanceId: string;
    at: number;
    ip?: string;
    metadata?: Record<string, unknown>;
    latencyMs?: number;
  };
  [SERVER_EVENTS.HARDWARE_EVENT]: {
    device: DeviceId;
    instanceId: string;
    at: number;
    event: string;
    payload?: unknown;
    ip?: string;
    metadata?: Record<string, unknown>;
  };
};

type EventMapEntry = ServerEventMap[keyof ServerEventMap];

type Listener<TPayload> = (payload: TPayload) => void;

export class ServerEventBus {
  private readonly emitter = new EventEmitter();

  on<TKey extends keyof ServerEventMap>(event: TKey, listener: Listener<ServerEventMap[TKey]>) {
    this.emitter.on(event, listener as (payload: EventMapEntry) => void);
    return () => this.off(event, listener);
  }

  once<TKey extends keyof ServerEventMap>(event: TKey, listener: Listener<ServerEventMap[TKey]>) {
    this.emitter.once(event, listener as (payload: EventMapEntry) => void);
    return () => this.off(event, listener);
  }

  off<TKey extends keyof ServerEventMap>(event: TKey, listener: Listener<ServerEventMap[TKey]>) {
    this.emitter.off(event, listener as (payload: EventMapEntry) => void);
  }

  emit<TKey extends keyof ServerEventMap>(event: TKey, payload: ServerEventMap[TKey]) {
    this.emitter.emit(event, payload);
  }
}

export type { ServerEventMap };
