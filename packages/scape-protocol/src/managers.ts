import type { DeviceId, DeviceMetadata, DeviceTransport } from "./devices.js";

export const ROUTER_EVENTS = {
  REGISTER: "device:register",
  UNREGISTER: "device:unregister",
  HEARTBEAT: "device:heartbeat",
  EXECUTE: "direct:execute"
} as const;

export const SDK_EVENTS = {
  RESET: "sdk:reset"
} as const;

export interface RegisterDevicePayload {
  device: DeviceId;
  instanceId?: string;
  metadata?: DeviceMetadata;
  transport?: DeviceTransport;
}

export interface HeartbeatPayload {
  device: DeviceId;
  instanceId: string;
  at: number;
}

export interface DirectExecuteEnvelope {
  target: DeviceId;
  command: string;
  payload?: unknown;
  source?: DeviceId;
  sourceInstanceId?: string;
  targetInstanceId?: string;
}

export interface ResetPayload {
  source?: DeviceId;
  sourceInstanceId?: string;
  reason?: string;
  at?: number;
  metadata?: Record<string, unknown>;
}

export const STORAGE_EVENTS = {
  MODIFY: "modify-storage",
  SUBSCRIBE: "subscribe-storage",
  UNSUBSCRIBE: "unsubscribe-storage",
  UPDATE: "storage-update"
} as const;

export type StorageSnapshot = Record<string, unknown>;

export interface StorageModifyOptions {
  /**
   * When true, all keys in the patch become persistent and will be written to disk.
   */
  persist?: boolean;
  /**
   * Explicit list of top-level keys that should become persistent. Overrides `persist` when provided.
   */
  persistKeys?: string[];
}

export interface StorageModifyPayload extends StorageModifyOptions {
  patch: Record<string, unknown>;
}

export interface StorageSubscribePayload {
  keys?: string[];
}

export interface StorageUpdatePayload {
  state: StorageSnapshot;
  changedKeys?: string[];
}

export const DEVICE_MANAGER_EVENTS = {
  LIST: "devices:list",
  LATENCY: "devices:latency",
  UNREGISTERED: "devices:unregistered"
} as const;

export interface DeviceLatencyPayload {
  device: DeviceId;
  latencyMs: number;
  instanceId: string;
}

export interface DeviceConnectionSummary {
  device: DeviceId;
  instanceId: string;
  transport: DeviceTransport;
  connectedAt: number;
  lastSeenAt: number;
  registered: boolean;
  metadata?: DeviceMetadata;
  latencyMs?: number;
}

export interface DeviceListPayload {
  devices: DeviceConnectionSummary[];
}

export interface UnregisteredDevicePayload {
  device: DeviceId;
  instanceId: string;
}

export const MONITOR_EVENTS = {
  STREAM: "monitor:event",
  HEARTBEAT: "monitor:heartbeat",
  HISTORY: "monitor:history"
} as const;

export interface MonitorEventPayload {
  at: number;
  source: DeviceId;
  target?: DeviceId;
  channel: string;
  detail?: Record<string, unknown>;
}

export interface MonitorHeartbeatPayload {
  device: DeviceId;
  instanceId: string;
  latencyMs?: number;
  at: number;
}

export interface MonitorHistoryPayload {
  events: MonitorEventPayload[];
}

export const PRINTER_EVENTS = {
  PRINT: "print"
} as const;

export interface PrintPayload {
  document?: string;
  copies?: number;
  variables?: Record<string, string>;
}

export const STATUS_EVENTS = {
  START: "start-scape",
  PAUSE: "pause-scape",
  RESTART: "restart-scape",
  WIN: "win-scape"
} as const;

export interface StatusPayload {
  operator?: string;
  at?: number;
  note?: string;
}
