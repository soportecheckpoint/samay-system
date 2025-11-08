import { SERVER_EVENTS, ServerEventBus } from "../app/events.js";
import {
  DEVICE_MANAGER_EVENTS,
  ROUTER_EVENTS,
  type DeviceConnectionSnapshot,
  type DeviceConnectionSummary,
  type DeviceId,
  type DeviceLatencyPayload,
  type DeviceMetadata,
  type HeartbeatPayload,
  type RegisterDevicePayload
} from "@samay/scape-protocol";
import type { Server, Socket } from "socket.io";
import { logger } from "../utils/logger.js";

interface DeviceSession extends DeviceConnectionSnapshot {
  socket: Socket;
}

interface DisconnectedDevice {
  id: DeviceId;
  instanceId: string;
  lastConnectedAt: number;
  disconnectedAt: number;
  ip?: string;
  transport: string;
  metadata?: DeviceMetadata;
  connectionHistory: Array<{
    connectedAt: number;
    disconnectedAt?: number;
    duration?: number;
  }>;
}

export class DeviceManager {
  private readonly sessions = new Map<string, DeviceSession>();
  private readonly deviceIndex = new Map<DeviceId, Map<string, DeviceSession>>();
  private readonly disconnectedDevices = new Map<string, DisconnectedDevice>();

  constructor(
    private readonly io: Server,
    private readonly bus: ServerEventBus
  ) {
    // Limpiar dispositivos desconectados antiguos cada hora
    setInterval(() => {
      const cleared = this.clearOldDisconnectedDevices();
      if (cleared > 0) {
        logger.info(`[DeviceManager] Cleaned ${cleared} old disconnected devices`);
      }
    }, 60 * 60 * 1000); // 1 hora
  }

  attach(socket: Socket): void {
    socket.on(ROUTER_EVENTS.REGISTER, (payload: RegisterDevicePayload) => {
      this.handleRegister(socket, payload);
    });

    socket.on(ROUTER_EVENTS.UNREGISTER, () => {
      this.handleUnregister(socket.id);
    });

    socket.on(ROUTER_EVENTS.HEARTBEAT, (payload: HeartbeatPayload) => {
      this.handleHeartbeat(socket.id, payload);
    });

    socket.on("disconnect", () => {
      this.handleUnregister(socket.id);
    });
  }

  sendLatencyUpdate(payload: DeviceLatencyPayload & { at: number }): void {
    this.io.emit(DEVICE_MANAGER_EVENTS.LATENCY, payload);
    this.bus.emit(SERVER_EVENTS.DEVICE_HEARTBEAT, payload);
  }

  private handleRegister(socket: Socket, payload: RegisterDevicePayload): void {
    if (!payload.device) {
      logger.warn(`[DeviceManager] Socket ${socket.id} tried to register without device id`);
      return;
    }

    const existing = this.sessions.get(socket.id);
    if (existing) {
      this.removeFromIndex(existing);
    }

    const instanceId = payload.instanceId ?? socket.id;
    const now = Date.now();
    const ip = this.resolveIp(socket) ?? existing?.ip;

    // Verificar si es una reconexión de un dispositivo previamente desconectado
    const disconnectedKey = `${payload.device}:${instanceId}`;
    const disconnectedDevice = this.disconnectedDevices.get(disconnectedKey);
    
    let connectionHistory = disconnectedDevice?.connectionHistory || [];
    
    // Si es una reconexión, agregar nueva entrada al historial
    if (disconnectedDevice) {
      connectionHistory.push({
        connectedAt: now
      });
      // Eliminar de dispositivos desconectados ya que se está reconectando
      this.disconnectedDevices.delete(disconnectedKey);
    } else {
      // Nueva conexión
      connectionHistory = [{
        connectedAt: now
      }];
    }

    // Eliminar todos los dispositivos offline con el mismo deviceId
    this.cleanupOfflineDevices(payload.device, instanceId);

    const registered: DeviceSession = {
      socket,
      id: payload.device,
      socketId: socket.id,
      instanceId,
      connectedAt: existing?.connectedAt ?? now,
      lastSeenAt: now,
      transport: payload.transport ?? "socket",
      metadata: payload.metadata as DeviceMetadata | undefined,
      registered: true,
      ip
    };

    this.sessions.set(socket.id, registered);
    this.addToIndex(registered);

    const ipInfo = registered.ip ? ` from ${registered.ip}` : "";
    const reconnectInfo = disconnectedDevice ? " (reconnected)" : "";
    logger.info(
      `[DeviceManager] Device registered: ${registered.id} (${registered.instanceId}) via ${registered.transport}${ipInfo}${reconnectInfo}`
    );

    this.emitList();
    this.bus.emit(SERVER_EVENTS.DEVICE_REGISTERED, registered);
  }

  private handleUnregister(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) {
      return;
    }

    this.sessions.delete(socketId);
    this.removeFromIndex(session);

    // Guardar información del dispositivo desconectado
    const disconnectedKey = `${session.id}:${session.instanceId}`;
    const existingDisconnected = this.disconnectedDevices.get(disconnectedKey);
    
    const connectionHistory = existingDisconnected?.connectionHistory || [];
    const currentConnection = connectionHistory[connectionHistory.length - 1];
    if (currentConnection && !currentConnection.disconnectedAt) {
      currentConnection.disconnectedAt = Date.now();
      currentConnection.duration = currentConnection.disconnectedAt - currentConnection.connectedAt;
    }

    const disconnectedDevice: DisconnectedDevice = {
      id: session.id,
      instanceId: session.instanceId,
      lastConnectedAt: session.connectedAt,
      disconnectedAt: Date.now(),
      ip: session.ip,
      transport: session.transport,
      metadata: session.metadata,
      connectionHistory: connectionHistory.length > 0 ? connectionHistory : [{
        connectedAt: session.connectedAt,
        disconnectedAt: Date.now(),
        duration: Date.now() - session.connectedAt
      }]
    };

    this.disconnectedDevices.set(disconnectedKey, disconnectedDevice);

    const ipInfo = session.ip ? ` from ${session.ip}` : "";
    logger.info(
      `[DeviceManager] Device disconnected: ${session.id} (${session.instanceId})${ipInfo}`
    );

    this.bus.emit(SERVER_EVENTS.DEVICE_UNREGISTERED, session);
    this.bus.emit(SERVER_EVENTS.DEVICE_DISCONNECTED, {
      id: session.id,
      instanceId: session.instanceId,
      disconnectedAt: Date.now(),
      ip: session.ip,
      transport: session.transport,
      metadata: session.metadata,
      connectionHistory: disconnectedDevice.connectionHistory
    });
    this.io.emit(DEVICE_MANAGER_EVENTS.UNREGISTERED, {
      device: session.id,
      instanceId: session.instanceId
    });
    this.emitList();
  }

  private handleHeartbeat(socketId: string, payload: HeartbeatPayload): void {
    const session = this.sessions.get(socketId);
    if (!session) {
      return;
    }

    const now = Date.now();
    const latency = Math.max(0, now - payload.at);
    session.lastSeenAt = now;
    session.latencyMs = latency;

    const heartbeatPayload: DeviceLatencyPayload & { at: number } = {
      device: session.id,
      instanceId: session.instanceId,
      latencyMs: latency,
      at: now
    };

    this.sendLatencyUpdate(heartbeatPayload);
  }

  private addToIndex(session: DeviceSession) {
    const group = this.deviceIndex.get(session.id) ?? new Map<string, DeviceSession>();
    group.set(session.instanceId, session);
    this.deviceIndex.set(session.id, group);
  }

  private removeFromIndex(session: DeviceSession) {
    const group = this.deviceIndex.get(session.id);
    if (!group) {
      return;
    }

    group.delete(session.instanceId);
    if (group.size === 0) {
      this.deviceIndex.delete(session.id);
    }
  }

  private emitList(): void {
    const summaries = this.getSummaries();
    const disconnected = this.getDisconnectedDevices().map(device => ({
      device: device.id,
      instanceId: device.instanceId,
      transport: device.transport,
      connectedAt: device.lastConnectedAt,
      disconnectedAt: device.disconnectedAt,
      registered: false,
      metadata: device.metadata,
      ip: device.ip,
      connectionCount: device.connectionHistory.length,
      totalConnectionTime: device.connectionHistory.reduce((sum, conn) => sum + (conn.duration || 0), 0)
    }));

    this.io.emit(DEVICE_MANAGER_EVENTS.LIST, { 
      devices: summaries,
      disconnected: disconnected
    });
    this.bus.emit(
      SERVER_EVENTS.DEVICE_LIST_CHANGED,
      this.getAll().map((session) => this.toSnapshot(session))
    );
  }

  getDeviceSessions(device: DeviceId): DeviceSession[] {
    const group = this.deviceIndex.get(device);
    if (!group) {
      return [];
    }
    return [...group.values()];
  }

  findBySocketId(socketId: string): DeviceSession | undefined {
    return this.sessions.get(socketId);
  }

  getAll(): DeviceSession[] {
    return [...this.sessions.values()];
  }

  getSummaries(): DeviceConnectionSummary[] {
    return this.getAll().map((session) => ({
      device: session.id,
      instanceId: session.instanceId,
      transport: session.transport,
      connectedAt: session.connectedAt,
      lastSeenAt: session.lastSeenAt,
      registered: session.registered,
      metadata: session.metadata,
      latencyMs: session.latencyMs,
      ip: session.ip
    }));
  }

  getDisconnectedDevices(): DisconnectedDevice[] {
    return [...this.disconnectedDevices.values()];
  }

  getDisconnectedDevice(deviceId: DeviceId, instanceId: string): DisconnectedDevice | undefined {
    return this.disconnectedDevices.get(`${deviceId}:${instanceId}`);
  }

  getAllDeviceHistories(): Map<string, DisconnectedDevice> {
    return new Map(this.disconnectedDevices);
  }

  clearDisconnectedDevice(deviceId: DeviceId, instanceId: string): boolean {
    return this.disconnectedDevices.delete(`${deviceId}:${instanceId}`);
  }

  clearOldDisconnectedDevices(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, device] of this.disconnectedDevices.entries()) {
      if (now - device.disconnectedAt > maxAgeMs) {
        this.disconnectedDevices.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  private cleanupOfflineDevices(deviceId: DeviceId, currentInstanceId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, device] of this.disconnectedDevices.entries()) {
      // Si es el mismo deviceId pero diferente instanceId, eliminarlo
      if (device.id === deviceId && device.instanceId !== currentInstanceId) {
        keysToDelete.push(key);
      }
    }
    
    // Eliminar los dispositivos encontrados
    for (const key of keysToDelete) {
      this.disconnectedDevices.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      logger.info(
        `[DeviceManager] Cleaned up ${keysToDelete.length} offline devices for ${deviceId}`
      );
    }
  }

  toSnapshot(session: DeviceSession): DeviceConnectionSnapshot {
    return {
      id: session.id,
      socketId: session.socketId,
      instanceId: session.instanceId,
      connectedAt: session.connectedAt,
      lastSeenAt: session.lastSeenAt,
      transport: session.transport,
      metadata: session.metadata,
      registered: session.registered,
      latencyMs: session.latencyMs,
      ip: session.ip
    };
  }

  private resolveIp(socket: Socket): string | undefined {
    const forwarded = socket.handshake.headers["x-forwarded-for"];
    const candidate = Array.isArray(forwarded) ? forwarded.find(Boolean) : forwarded;
    const sources: Array<string | string[] | undefined | null> = [
      candidate,
      socket.handshake.address,
      socket.conn.remoteAddress,
      socket.request.socket?.remoteAddress
    ];

    for (const source of sources) {
      const normalized = this.normalizeIp(source);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private normalizeIp(input: string | string[] | undefined | null): string | undefined {
    if (!input) {
      return undefined;
    }

    const raw = Array.isArray(input) ? input.find(Boolean) : input;
    if (typeof raw !== "string") {
      return undefined;
    }

    const [first] = raw.split(",").map((part) => part.trim()).filter(Boolean);
    if (!first) {
      return undefined;
    }

    return first.startsWith("::ffff:") ? first.slice(7) : first;
  }
}
