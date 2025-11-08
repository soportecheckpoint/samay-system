import { EventEmitter } from "events";
import type {
  DirectExecuteEnvelope,
  DeviceConnectionSnapshot,
  DeviceId,
  DeviceLatencyPayload,
  MonitorEventPayload,
  MonitorHeartbeatPayload,
  StorageUpdatePayload
} from "@samay/scape-protocol";

export const SERVER_EVENTS = {
  DEVICE_REGISTERED: "device:registered",
  DEVICE_UNREGISTERED: "device:unregistered",
  DEVICE_LIST_CHANGED: "device:list",
  DEVICE_HEARTBEAT: "device:heartbeat",
  DIRECT_EXECUTED: "direct:executed",
  MONITOR_EVENT: "monitor:event",
  MONITOR_HEARTBEAT: "monitor:heartbeat",
  STORAGE_UPDATED: "storage:updated"
} as const;

type ServerEventMap = {
  [SERVER_EVENTS.DEVICE_REGISTERED]: DeviceConnectionSnapshot;
  [SERVER_EVENTS.DEVICE_UNREGISTERED]: DeviceConnectionSnapshot;
  [SERVER_EVENTS.DEVICE_LIST_CHANGED]: DeviceConnectionSnapshot[];
  [SERVER_EVENTS.DEVICE_HEARTBEAT]: DeviceLatencyPayload & {
    at: number;
  };
  [SERVER_EVENTS.DIRECT_EXECUTED]: {
    envelope: DirectExecuteEnvelope;
    eventName: string;
    recipients: DeviceConnectionSnapshot[];
  };
  [SERVER_EVENTS.MONITOR_EVENT]: MonitorEventPayload;
  [SERVER_EVENTS.MONITOR_HEARTBEAT]: MonitorHeartbeatPayload;
  [SERVER_EVENTS.STORAGE_UPDATED]: StorageUpdatePayload;
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
