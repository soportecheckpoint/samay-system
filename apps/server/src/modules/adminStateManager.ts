import {
  DEVICE_CATALOG,
  type AdminDeviceSnapshot,
  type AdminEventSnapshot,
  type AdminLatencySample,
  type AdminStateSnapshot,
  type DeviceConnectionSnapshot,
  type DeviceDescriptor,
  type DeviceId,
  type DeviceLatencyPayload,
  type DeviceMetadata
} from "@samay/scape-protocol";
import { SERVER_EVENTS, type ServerEventBus } from "../app/events.js";
import type { StorageManager } from "./storageManager.js";
import { randomUUID } from "node:crypto";

type AdminDeviceEntry = AdminDeviceSnapshot;
type AdminEventEntry = AdminEventSnapshot;

const MAX_EVENT_HISTORY = 100;
const DEFAULT_TRANSPORT = "socket";

const now = () => Date.now();

const toKey = (device: DeviceId, instanceId: string) => `${device}::${instanceId}`;

const labelForDevice = (device: DeviceId): string | undefined => {
  const match = (DEVICE_CATALOG as Record<string, DeviceDescriptor | undefined>)[device];
  return match?.label;
};

const kindForDevice = (device: DeviceId): string | undefined => {
  const match = (DEVICE_CATALOG as Record<string, DeviceDescriptor | undefined>)[device];
  return match?.kind;
};

export class AdminStateManager {
  private readonly storage: StorageManager;
  private readonly bus: ServerEventBus;
  private readonly devices = new Map<string, AdminDeviceEntry>();
  private readonly events: AdminEventEntry[] = [];
  private readonly latencyHistory: AdminLatencySample[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private pendingFlush = false;

  constructor(storage: StorageManager, bus: ServerEventBus) {
    this.storage = storage;
    this.bus = bus;

    this.hydrateFromStorage();
    this.registerListeners();
    this.flush();
  }

  private hydrateFromStorage(): void {
    const snapshot = this.storage.getState()?.adminState as AdminStateSnapshot | undefined;
    if (!snapshot) {
      return;
    }

    snapshot.devices?.forEach((entry) => {
      const key = toKey(entry.device, entry.instanceId);
      this.devices.set(key, { ...entry });
    });

    if (Array.isArray(snapshot.events)) {
      this.events.push(...snapshot.events.slice(-MAX_EVENT_HISTORY));
    }

    if (Array.isArray(snapshot.latencyHistory)) {
      this.latencyHistory.push(...snapshot.latencyHistory.slice(-200));
    }
  }

  private registerListeners(): void {
    this.bus.on(SERVER_EVENTS.DEVICE_LIST_CHANGED, (snapshots) => {
      this.applyDeviceSummaries(snapshots);
    });

    this.bus.on(SERVER_EVENTS.DEVICE_REGISTERED, (snapshot) => {
      this.applyDeviceRegistered(snapshot);
    });

    this.bus.on(SERVER_EVENTS.DEVICE_DISCONNECTED, (payload) => {
      this.applyDeviceDisconnected(payload);
    });

    this.bus.on(SERVER_EVENTS.DEVICE_LATENCY, (payload) => {
      this.applyDeviceLatency(payload);
    });

    this.bus.on(SERVER_EVENTS.HARDWARE_HEARTBEAT, (payload) => {
      this.applyHardwareHeartbeat(payload.device, payload.instanceId, payload);
    });

    this.bus.on(SERVER_EVENTS.HARDWARE_EVENT, (payload) => {
      this.applyHardwareEvent(payload.device, payload.instanceId, payload.event, payload);
    });

    this.bus.on(SERVER_EVENTS.DIRECT_EXECUTED, ({ envelope, eventName, recipients }) => {
      const timestamp = now();

      if (recipients.length > 0) {
        recipients.forEach((recipient) => {
          this.applyDirectExecution(recipient.id, recipient.instanceId, envelope.command, {
            at: timestamp,
            source: envelope.source,
            sourceInstanceId: envelope.sourceInstanceId,
            payload: envelope.payload,
            eventName,
            transport: recipient.transport,
            metadata: recipient.metadata
          });
        });
      } else {
        this.applyDirectExecution(
          envelope.target,
          envelope.targetInstanceId ?? "default",
          envelope.command,
          {
            at: timestamp,
            source: envelope.source,
            sourceInstanceId: envelope.sourceInstanceId,
            payload: envelope.payload,
            eventName
          }
        );
      }
    });

    this.bus.on(SERVER_EVENTS.MONITOR_EVENT, (payload) => {
      this.recordEvent({
        id: this.generateEventId(),
        at: payload.at,
        type: "monitor",
        source: payload.source,
        target: payload.target,
        channel: payload.channel,
        payload: payload.detail,
        description: "Monitor event"
      });
    });
  }

  private applyDeviceSummaries(snapshots: DeviceConnectionSnapshot[]): void {
    // Create updated map from current snapshots
    const updated = new Map<string, AdminDeviceEntry>();

    for (const snapshot of snapshots) {
      const key = toKey(snapshot.id, snapshot.instanceId);
      const existing = this.devices.get(key);

      const entry: AdminDeviceEntry = {
        device: snapshot.id,
        instanceId: snapshot.instanceId,
        transport: snapshot.transport ?? DEFAULT_TRANSPORT,
        connectedAt: snapshot.connectedAt ?? existing?.connectedAt ?? now(),
        lastSeenAt: snapshot.lastSeenAt ?? existing?.lastSeenAt ?? now(),
        connectionStatus: snapshot.registered ? "online" : "offline",
        registered: snapshot.registered,
        metadata: this.mergeMetadata(existing?.metadata, snapshot.metadata, snapshot.id),
        latencyMs: snapshot.latencyMs ?? existing?.latencyMs,
        lastCommand: existing?.lastCommand,
        lastCommandAt: existing?.lastCommandAt,
        ip: snapshot.ip ?? existing?.ip
      };

      updated.set(key, entry);
    }

    // Keep disconnected devices that are not in current snapshots
    for (const [key, existing] of this.devices.entries()) {
      if (!updated.has(key) && existing.connectionStatus === "offline") {
        // Keep offline devices that are not currently connected
        updated.set(key, existing);
      }
    }

    // Replace devices map with updated one
    this.devices.clear();
    for (const [key, entry] of updated.entries()) {
      this.devices.set(key, entry);
    }

    this.scheduleFlush();
  }

  private applyDeviceRegistered(snapshot: DeviceConnectionSnapshot): void {
    // Cuando un dispositivo se registra, limpiar otros dispositivos offline con el mismo deviceId
    this.cleanupOfflineDevices(snapshot.id, snapshot.instanceId);
    this.scheduleFlush();
  }

private applyDeviceDisconnected(payload: {
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
}): void {
  const key = toKey(payload.id, payload.instanceId);
  const existing = this.devices.get(key);
  
  if (!existing) {
    // Si no existe, crear una entrada para el dispositivo desconectado
    const entry: AdminDeviceEntry = {
      device: payload.id,
      instanceId: payload.instanceId,
      transport: payload.transport,
      connectedAt: payload.connectionHistory[0]?.connectedAt ?? null,
      lastSeenAt: payload.disconnectedAt,
      connectionStatus: "offline",
      registered: false,
      metadata: this.mergeMetadata(undefined, payload.metadata, payload.id),
      ip: payload.ip
    };

    this.devices.set(key, entry);
  } else {
    // Si existe, actualizar su estado a desconectado pero mantener la información
    existing.connectionStatus = "offline";
    existing.registered = false;
    existing.lastSeenAt = payload.disconnectedAt;
    existing.ip = payload.ip ?? existing.ip;
    
    this.devices.set(key, existing);
  }

  this.scheduleFlush();
}

private cleanupOfflineDevices(connectedDeviceId: DeviceId, connectedInstanceId: string): void {
  const keysToDelete: string[] = [];
  
  for (const [key, device] of this.devices.entries()) {
    // Si es el mismo device ID, está offline, y no es el que se acaba de conectar
    if (device.device === connectedDeviceId && 
        device.connectionStatus === "offline" && 
        device.instanceId !== connectedInstanceId) {
      keysToDelete.push(key);
    }
  }
  
  // Eliminar los dispositivos encontrados
  for (const key of keysToDelete) {
    this.devices.delete(key);
  }
  
  if (keysToDelete.length > 0) {
    // Log para depuración
    console.log(`[AdminStateManager] Cleaned up ${keysToDelete.length} offline devices for ${connectedDeviceId}`);
  }
}

  private applyDeviceLatency(payload: DeviceLatencyPayload & { at: number }): void {
    const key = toKey(payload.device, payload.instanceId);
    const entry = this.devices.get(key);
    if (!entry) {
      return; // Only update existing entries
    }

    entry.latencyMs = payload.latencyMs;
    entry.lastSeenAt = payload.at;
    entry.connectionStatus = "online";
    entry.transport = entry.transport || DEFAULT_TRANSPORT;

    this.devices.set(key, entry);

    if (typeof payload.latencyMs === "number") {
      this.recordLatencySample({
        device: payload.device,
        instanceId: payload.instanceId,
        latencyMs: payload.latencyMs,
        at: payload.at,
        pingId: payload.pingId
      });
    }

    this.scheduleFlush();
  }

  private applyHardwareHeartbeat(
    device: DeviceId,
    instanceId: string,
    payload: {
      at: number;
      ip?: string;
      metadata?: Record<string, unknown>;
      latencyMs?: number;
    }
  ): void {
    const key = toKey(device, instanceId);
    const entry = this.devices.get(key);
    if (!entry) {
      return; // Only update existing entries
    }

    entry.transport = "http";
    entry.lastSeenAt = payload.at;
    entry.connectedAt = entry.connectedAt ?? payload.at;
    entry.connectionStatus = "online";
    entry.ip = payload.ip ?? entry.ip;
    entry.metadata = this.mergeMetadata(entry.metadata, payload.metadata, device);
    entry.latencyMs = payload.latencyMs ?? entry.latencyMs;

    this.devices.set(key, entry);

    if (typeof payload.latencyMs === "number") {
      this.recordLatencySample({
        device,
        instanceId,
        latencyMs: payload.latencyMs,
        at: payload.at
      });
    }

    this.scheduleFlush();
  }

  private applyHardwareEvent(
    device: DeviceId,
    instanceId: string,
    event: string,
    payload: { at: number; ip?: string; metadata?: Record<string, unknown>; payload?: unknown }
  ): void {
    const key = toKey(device, instanceId);
    const entry = this.devices.get(key);
    if (!entry) {
      return; // Only update existing entries
    }

    entry.transport = "http";
    entry.lastSeenAt = payload.at;
    entry.connectedAt = entry.connectedAt ?? payload.at;
    entry.connectionStatus = "online";
    entry.ip = payload.ip ?? entry.ip;
    entry.metadata = this.mergeMetadata(entry.metadata, payload.metadata, device);
    entry.lastCommand = event;
    entry.lastCommandAt = payload.at;

    this.devices.set(key, entry);

    this.recordEvent({
      id: this.generateEventId(),
      at: payload.at,
      type: "hardware",
      source: device,
      channel: event,
      payload: payload.payload,
      description: `Hardware event received: ${event}`
    });

    this.scheduleFlush();
  }

  private applyDirectExecution(
    target: DeviceId,
    instanceId: string,
    command: string,
    context: {
      at: number;
      source?: DeviceId;
      sourceInstanceId?: string;
      payload?: unknown;
      eventName: string;
      transport?: string;
      metadata?: DeviceMetadata;
    }
  ): void {
    const key = toKey(target, instanceId);
    const entry = this.devices.get(key);
    if (!entry) {
      return; // Only update existing entries
    }

    entry.lastSeenAt = context.at;
    entry.connectionStatus = "online";
    entry.lastCommand = command;
    entry.lastCommandAt = context.at;
    entry.transport = context.transport ?? entry.transport ?? DEFAULT_TRANSPORT;
    entry.metadata = this.mergeMetadata(entry.metadata, context.metadata, target);

    this.devices.set(key, entry);
    this.scheduleFlush();
  }

  private mergeMetadata(
    previous: (DeviceMetadata & Record<string, unknown>) | undefined,
    next: Record<string, unknown> | DeviceMetadata | undefined,
    device: DeviceId
  ) {
    const merged = {
      ...(previous ?? {}),
      ...(typeof next === "object" && next ? next : {})
    } as DeviceMetadata & Record<string, unknown>;

    if (!("label" in merged)) {
      const label = labelForDevice(device);
      if (label) {
        merged.label = label;
      }
    }

    if (!("kind" in merged)) {
      const kind = kindForDevice(device);
      if (kind) {
        merged.kind = kind;
      }
    }

    return merged;
  }

  private createEntry(device: DeviceId, instanceId: string): AdminDeviceEntry {
    return {
      device,
      instanceId,
      transport: DEFAULT_TRANSPORT,
      connectedAt: null,
      lastSeenAt: null,
      connectionStatus: "offline"
    };
  }

  private recordEvent(event: AdminEventEntry): void {
    this.events.push(event);
    if (this.events.length > MAX_EVENT_HISTORY) {
      this.events.splice(0, this.events.length - MAX_EVENT_HISTORY);
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.pendingFlush) {
      return;
    }

    this.pendingFlush = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, 25);
  }

  private flush(): void {
    this.pendingFlush = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const devices = Array.from(this.devices.values()).map((entry) => ({ ...entry }));
    devices.sort((a, b) => {
      if (a.device !== b.device) {
        return a.device.localeCompare(b.device);
      }
      return a.instanceId.localeCompare(b.instanceId);
    });

    const events = [...this.events];
    const latencyHistory = [...this.latencyHistory];

    const snapshot: AdminStateSnapshot = {
      devices,
      events,
      latencyHistory,
      updatedAt: now()
    };

    this.storage.patch({ adminState: snapshot });
  }

  private generateEventId(): string {
    return randomUUID();
  }

  private recordLatencySample(entry: AdminLatencySample): void {
    this.latencyHistory.push(entry);
    if (this.latencyHistory.length > 200) {
      this.latencyHistory.splice(0, this.latencyHistory.length - 200);
    }
  }
}
