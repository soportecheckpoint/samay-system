import { SERVER_EVENTS, ServerEventBus } from "../app/events.js";
import {
  DEVICE_MANAGER_EVENTS,
  ROUTER_EVENTS,
  type DeviceConnectionSnapshot,
  type DeviceConnectionSummary,
  type DeviceId,
  type DeviceLatencyPayload,
  type DeviceLatencyPingPayload,
  type DeviceLatencyPongPayload,
  type DeviceMetadata,
  type RegisterDevicePayload
} from "@samay/scape-protocol";
import type { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import { logger } from "../utils/logger.js";

interface DeviceSession extends DeviceConnectionSnapshot {
  socket: Socket | null;
  latencyTimer?: NodeJS.Timeout;
  pendingPings: Map<string, { sentAt: number; timeout: NodeJS.Timeout }>;
  httpPingState?: {
    baseUrl: string;
    pendingTimestamp?: number;
    timeout?: NodeJS.Timeout;
    nextPingTimer?: NodeJS.Timeout;
  };
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
  private readonly latencyPingIntervalMs = 2_000;
  private readonly latencyPingTimeoutMs = 5_000;

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

    socket.on(ROUTER_EVENTS.LATENCY_PONG, (payload: DeviceLatencyPongPayload) => {
      this.handleLatencyPong(socket.id, payload);
    });

    socket.on("disconnect", () => {
      this.handleUnregister(socket.id);
    });
  }

  registerHttpDevice(payload: {
    device: DeviceId;
    instanceId: string;
    transport: "http";
    metadata?: DeviceMetadata;
    ip?: string;
  }): void {
    const now = Date.now();
    const existing = this.sessions.get(payload.instanceId);

    if (existing) {
      // Actualizar sesión existente
      existing.lastSeenAt = now;
      existing.ip = payload.ip ?? existing.ip;
      existing.metadata = payload.metadata;
      existing.registered = true;
      existing.pendingPings = existing.pendingPings ?? new Map();
      this.sessions.set(payload.instanceId, existing);
      logger.info(
        `[DeviceManager] HTTP device updated: ${payload.device} (${payload.instanceId})`
      );
    } else {
      // Crear nueva sesión sin socket (HTTP device)
      const registered: DeviceSession = {
        socket: null,
        id: payload.device,
        socketId: payload.instanceId,
        instanceId: payload.instanceId,
        connectedAt: now,
        lastSeenAt: now,
        transport: "http",
        metadata: payload.metadata,
        registered: true,
        ip: payload.ip,
        pendingPings: new Map()
      };

      this.sessions.set(payload.instanceId, registered);
      this.addToIndex(registered);

      logger.info(
        `[DeviceManager] HTTP device registered: ${payload.device} (${payload.instanceId}) from ${payload.ip ?? 'unknown'}`
      );

      this.bus.emit(SERVER_EVENTS.DEVICE_REGISTERED, registered);
    }

    this.emitList();
  }

  updateHttpDeviceActivity(instanceId: string): void {
    const session = this.sessions.get(instanceId);
    if (session && session.transport === "http") {
      session.lastSeenAt = Date.now();
      this.sessions.set(instanceId, session);
    }
  }

  disconnectHttpDevice(instanceId: string): void {
    const session = this.sessions.get(instanceId);
    if (!session || session.transport !== "http") {
      return;
    }

    this.stopLatencyProbe(session);
    this.sessions.delete(instanceId);
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
      `[DeviceManager] HTTP device disconnected: ${session.id} (${session.instanceId})${ipInfo}`
    );

    this.bus.emit(SERVER_EVENTS.DEVICE_UNREGISTERED, {
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
    });

    this.emitList();
  }

  startHttpLatencyProbe(instanceId: string, baseUrl: string, _intervalMs: number = 10_000): void {
    const session = this.sessions.get(instanceId);
    if (!session || session.transport !== "http") {
      return;
    }

    this.stopLatencyProbe(session);

    // Inicializar estado de ping HTTP
    session.httpPingState = {
      baseUrl
    };

    // Enviar el primer ping inmediatamente
    this.scheduleNextHttpPing(session, 0);
  }

  sendLatencyUpdate(payload: DeviceLatencyPayload & { at: number }): void {
    this.io.emit(DEVICE_MANAGER_EVENTS.LATENCY, payload);
    this.bus.emit(SERVER_EVENTS.DEVICE_LATENCY, payload);
  }

  private handleRegister(socket: Socket, payload: RegisterDevicePayload): void {
    if (!payload.device) {
      logger.warn(`[DeviceManager] Socket ${socket.id} tried to register without device id`);
      return;
    }

    const existing = this.sessions.get(socket.id);
    if (existing) {
      this.stopLatencyProbe(existing);
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
      ip,
      pendingPings: new Map()
    };

    this.sessions.set(socket.id, registered);
    this.addToIndex(registered);
    this.startLatencyProbe(registered);

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

    this.stopLatencyProbe(session);
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

  private startLatencyProbe(session: DeviceSession): void {
    if (!session.socket) {
      return;
    }

    this.stopLatencyProbe(session);

    const sendPing = () => this.dispatchLatencyPing(session);
    sendPing();
    session.latencyTimer = setInterval(sendPing, this.latencyPingIntervalMs);
  }

  private stopLatencyProbe(session: DeviceSession): void {
    if (session.latencyTimer) {
      clearInterval(session.latencyTimer);
      session.latencyTimer = undefined;
    }

    for (const { timeout } of session.pendingPings.values()) {
      clearTimeout(timeout);
    }

    session.pendingPings.clear();

    // Limpiar estado de ping HTTP
    if (session.httpPingState) {
      if (session.httpPingState.timeout) {
        clearTimeout(session.httpPingState.timeout);
      }
      if (session.httpPingState.nextPingTimer) {
        clearTimeout(session.httpPingState.nextPingTimer);
      }
      session.httpPingState = undefined;
    }
  }

  private dispatchLatencyPing(session: DeviceSession): void {
    if (!session.socket || session.socket.disconnected) {
      return;
    }

    const pingId = randomUUID();
    const sentAt = Date.now();
    const timeout = setTimeout(() => {
      session.pendingPings.delete(pingId);
    }, this.latencyPingTimeoutMs);

    session.pendingPings.set(pingId, { sentAt, timeout });

    const payload: DeviceLatencyPingPayload = {
      pingId,
      sentAt
    };

    try {
      session.socket.emit(ROUTER_EVENTS.LATENCY_PING, payload);
    } catch (error) {
      clearTimeout(timeout);
      session.pendingPings.delete(pingId);
      logger.warn(
        `[DeviceManager] Failed to emit latency ping to ${session.id} (${session.instanceId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private handleLatencyPong(socketId: string, payload: DeviceLatencyPongPayload): void {
    const session = this.sessions.get(socketId);
    if (!session) {
      return;
    }

    if (!payload || typeof payload.pingId !== "string") {
      return;
    }

    const pending = session.pendingPings.get(payload.pingId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    session.pendingPings.delete(payload.pingId);

    const now = Date.now();
    const latency = Math.max(0, now - pending.sentAt);

    session.lastSeenAt = now;
    session.latencyMs = latency;

    const latencyPayload: DeviceLatencyPayload & { at: number; pingId: string } = {
      device: session.id,
      instanceId: session.instanceId,
      latencyMs: latency,
      at: now,
      pingId: payload.pingId
    };

    this.sendLatencyUpdate(latencyPayload);
  }

  handleHttpPong(instanceId: string, sentTimestamp: number): void {
    const session = this.sessions.get(instanceId);
    if (!session || session.transport !== "http") {
      return;
    }

    // Verificar que este pong corresponde al ping pendiente
    if (!session.httpPingState?.pendingTimestamp || 
        session.httpPingState.pendingTimestamp !== sentTimestamp) {
      logger.warn(
        `[DeviceManager] Received unexpected pong from ${session.id}: expected ${session.httpPingState?.pendingTimestamp}, got ${sentTimestamp}`
      );
      return;
    }

    // Cancelar el timeout del ping pendiente
    if (session.httpPingState.timeout) {
      clearTimeout(session.httpPingState.timeout);
      session.httpPingState.timeout = undefined;
    }

    const now = Date.now();
    const latency = Math.max(0, now - sentTimestamp);

    session.lastSeenAt = now;
    session.latencyMs = latency;
    session.httpPingState.pendingTimestamp = undefined;

    const latencyPayload: DeviceLatencyPayload & { at: number } = {
      device: session.id,
      instanceId: session.instanceId,
      latencyMs: latency,
      at: now
    };

    this.sendLatencyUpdate(latencyPayload);

    // Programar el siguiente ping después de 4 segundos
    this.scheduleNextHttpPing(session, 4_000);
  }

  /**
   * Programa el siguiente ping HTTP después de un delay
   */
  private scheduleNextHttpPing(session: DeviceSession, delayMs: number): void {
    if (!session.httpPingState) {
      return;
    }

    // Limpiar cualquier timer existente
    if (session.httpPingState.nextPingTimer) {
      clearTimeout(session.httpPingState.nextPingTimer);
    }

    session.httpPingState.nextPingTimer = setTimeout(() => {
      this.sendHttpPingWithTimeout(session);
    }, delayMs);
  }

  /**
   * Envía un ping HTTP y configura su timeout
   */
  private async sendHttpPingWithTimeout(session: DeviceSession): Promise<void> {
    if (!session.httpPingState || session.transport !== "http") {
      return;
    }

    const sentAt = Date.now();
    const baseUrl = session.httpPingState.baseUrl;
    const url = `${baseUrl}/ping?time=${sentAt}`;

    // Marcar el timestamp del ping pendiente
    session.httpPingState.pendingTimestamp = sentAt;

    // Configurar timeout de 10 segundos
    session.httpPingState.timeout = setTimeout(() => {
      logger.error(
        `[DeviceManager] HTTP ping timeout for ${session.id} (${session.instanceId}), disconnecting device`
      );
      
      // Limpiar el ping pendiente
      if (session.httpPingState) {
        session.httpPingState.pendingTimestamp = undefined;
        session.httpPingState.timeout = undefined;
      }

      // Desconectar el dispositivo HTTP por timeout
      this.disconnectHttpDevice(session.instanceId);
    }, 10_000);

    try {
      // Enviar el ping y procesar respuesta
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        // Calcular latencia inmediatamente
        this.handleHttpPong(session.instanceId, sentAt);
      } else {
        logger.error(
          `[DeviceManager] Ping to ${session.id} failed with status ${response.status}, disconnecting device`
        );
        // Limpiar estado y desconectar el dispositivo
        if (session.httpPingState) {
          if (session.httpPingState.timeout) {
            clearTimeout(session.httpPingState.timeout);
          }
          session.httpPingState.pendingTimestamp = undefined;
          session.httpPingState.timeout = undefined;
        }
        this.disconnectHttpDevice(session.instanceId);
      }
      
    } catch (error) {
      logger.error(
        `[DeviceManager] Failed to send HTTP ping to ${session.id} at ${url}, disconnecting device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      
      // Si falla el envío, limpiar y desconectar el dispositivo
      if (session.httpPingState) {
        if (session.httpPingState.timeout) {
          clearTimeout(session.httpPingState.timeout);
        }
        session.httpPingState.pendingTimestamp = undefined;
        session.httpPingState.timeout = undefined;
      }
      
      this.disconnectHttpDevice(session.instanceId);
    }
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

  /**
   * Busca un dispositivo HTTP por su IP
   * Útil para identificar Arduinos sin requerir parámetro de ID
   */
  findHttpDeviceByIp(ip: string): DeviceSession | undefined {
    if (!ip) {
      return undefined;
    }

    const normalizedIp = this.normalizeIp(ip);
    if (!normalizedIp) {
      return undefined;
    }

    for (const session of this.sessions.values()) {
      if (session.transport === "http" && session.ip) {
        const normalizedSessionIp = this.normalizeIp(session.ip);
        if (normalizedSessionIp === normalizedIp) {
          return session;
        }
      }
    }

    return undefined;
  }
}
