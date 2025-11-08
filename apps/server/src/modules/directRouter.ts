import {
  DEVICE_COMMAND_EVENTS,
  ROUTER_EVENTS,
  type DeviceId,
  type DirectExecuteEnvelope
} from "@samay/scape-protocol";
import type { Socket } from "socket.io";
import { SERVER_EVENTS, ServerEventBus } from "../app/events.js";
import type { DeviceManager } from "./deviceManager.js";

export class DirectRouter {
  constructor(
    private readonly deviceManager: DeviceManager,
    private readonly bus: ServerEventBus
  ) {}

  attach(socket: Socket): void {
    socket.on(ROUTER_EVENTS.EXECUTE, (envelope: DirectExecuteEnvelope) => {
      this.forward(socket, envelope);
    });
  }

  send(
    target: DeviceId,
    command: string,
    payload: unknown,
    options?: { targetInstanceId?: string; source?: DeviceId; sourceInstanceId?: string }
  ): number {
  const eventName = this.resolveEventName(target, command);
    const recipients = this.pickRecipients(target, options?.targetInstanceId);

    for (const recipient of recipients) {
      recipient.socket.emit(eventName, payload);
    }

    this.bus.emit(SERVER_EVENTS.DIRECT_EXECUTED, {
      envelope: {
        target,
          command,
        payload,
        source: options?.source,
        sourceInstanceId: options?.sourceInstanceId,
        targetInstanceId: options?.targetInstanceId
      },
      eventName,
      recipients: recipients.map((entry) => ({
        id: entry.id,
        socketId: entry.socketId,
        instanceId: entry.instanceId,
        connectedAt: entry.connectedAt,
        lastSeenAt: entry.lastSeenAt,
        transport: entry.transport,
        metadata: entry.metadata,
        registered: entry.registered,
        latencyMs: entry.latencyMs
      }))
    });

    return recipients.length;
  }

  private forward(socket: Socket, envelope: DirectExecuteEnvelope): void {
    const sender = this.deviceManager.findBySocketId(socket.id);
    const recipients = this.pickRecipients(envelope.target, envelope.targetInstanceId);
  const eventName = this.resolveEventName(envelope.target, envelope.command);

    for (const recipient of recipients) {
      recipient.socket.emit(eventName, envelope.payload);
    }

    const historyEntry = {
      envelope,
      eventName,
      recipients: recipients.map((entry) => ({
        id: entry.id,
        socketId: entry.socketId,
        instanceId: entry.instanceId,
        connectedAt: entry.connectedAt,
        lastSeenAt: entry.lastSeenAt,
        transport: entry.transport,
        metadata: entry.metadata,
        registered: entry.registered,
        latencyMs: entry.latencyMs
      }))
    } as const;

    this.bus.emit(SERVER_EVENTS.DIRECT_EXECUTED, historyEntry);

    if (sender) {
      sender.lastSeenAt = Date.now();
    }
  }

  private resolveEventName(target: DeviceId, command: string): string {
    const events = DEVICE_COMMAND_EVENTS[target] as Record<string, string> | undefined;
    const eventName = events?.[command];

    if (!eventName) {
      throw new Error(`Unknown command "${String(command)}" for device "${target}"`);
    }

    return eventName;
  }

  private pickRecipients(target: DeviceId, instanceId?: string) {
    const sessions = this.deviceManager.getDeviceSessions(target);
    if (!instanceId) {
      return sessions;
    }

    return sessions.filter((session) => session.instanceId === instanceId);
  }
}
