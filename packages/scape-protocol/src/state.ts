import type { DeviceId, DeviceMetadata } from "./devices.js";

export type AdminConnectionStatus = "online" | "offline" | "error";

export interface AdminDeviceSnapshot {
  device: DeviceId;
  instanceId: string;
  transport: string;
  connectedAt: number | null;
  lastSeenAt: number | null;
  latencyMs?: number;
  registered?: boolean;
  metadata?: (DeviceMetadata & Record<string, unknown>) | undefined;
  ip?: string;
  lastCommand?: string;
  lastCommandAt?: number;
  connectionStatus: AdminConnectionStatus;
}

export interface AdminEventSnapshot {
  id: string;
  at: number;
  type: "direct" | "hardware" | "monitor" | "device";
  source?: DeviceId;
  target?: DeviceId;
  channel?: string;
  description?: string;
  payload?: unknown;
}

export interface AdminStateSnapshot {
  devices: AdminDeviceSnapshot[];
  events: AdminEventSnapshot[];
  latencyHistory: AdminLatencySample[];
  updatedAt: number;
}

export interface AdminLatencySample {
  device: DeviceId;
  instanceId: string;
  latencyMs: number;
  at: number;
  pingId?: string;
}
