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

export class DeviceManager {
  private readonly sessions = new Map<string, DeviceSession>();
  private readonly deviceIndex = new Map<DeviceId, Map<string, DeviceSession>>();

  constructor(
    private readonly io: Server,
    private readonly bus: ServerEventBus
  ) {}

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

    const registered: DeviceSession = {
      socket,
      id: payload.device,
      socketId: socket.id,
      instanceId,
      connectedAt: existing?.connectedAt ?? now,
      lastSeenAt: now,
      transport: payload.transport ?? "socket",
      metadata: payload.metadata as DeviceMetadata | undefined,
      registered: true
    };

    this.sessions.set(socket.id, registered);
    this.addToIndex(registered);

    logger.info(
      `[DeviceManager] Device registered: ${registered.id} (${registered.instanceId}) via ${registered.transport}`
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

    logger.info(
      `[DeviceManager] Device disconnected: ${session.id} (${session.instanceId})`
    );

    this.bus.emit(SERVER_EVENTS.DEVICE_UNREGISTERED, session);
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

    const latency = Math.max(0, Date.now() - payload.at);
    session.lastSeenAt = Date.now();
    session.latencyMs = latency;

    const heartbeatPayload: DeviceLatencyPayload & { at: number } = {
      device: session.id,
      instanceId: session.instanceId,
      latencyMs: latency,
      at: session.lastSeenAt
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

    this.io.emit(DEVICE_MANAGER_EVENTS.LIST, { devices: summaries });
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
      latencyMs: session.latencyMs
    }));
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
      latencyMs: session.latencyMs
    };
  }
}
