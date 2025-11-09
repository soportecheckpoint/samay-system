import {
  DEVICE_COMMAND_EVENTS,
  ROUTER_EVENTS,
  type DeviceId,
  type DirectExecuteEnvelope
} from "@samay/scape-protocol";
import type { Socket } from "socket.io";
import { SERVER_EVENTS, ServerEventBus } from "../app/events.js";
import type { DeviceManager } from "./deviceManager.js";
import type { ArduinoBridge } from "./arduinoBridge.js";
import { logger } from "../utils/logger.js";

export class DirectRouter {
  constructor(
    private readonly deviceManager: DeviceManager,
    private readonly bus: ServerEventBus,
    private arduinoBridge?: ArduinoBridge
  ) {}

  setArduinoBridge(bridge: ArduinoBridge): void {
    this.arduinoBridge = bridge;
  }

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
    const envelope: DirectExecuteEnvelope = {
      target,
      command,
      payload,
      source: options?.source,
      sourceInstanceId: options?.sourceInstanceId,
      targetInstanceId: options?.targetInstanceId
    };

    return this.executeCommand(envelope, null);
  }

  private forward(socket: Socket, envelope: DirectExecuteEnvelope): void {
    this.executeCommand(envelope, socket);
  }

  private executeCommand(envelope: DirectExecuteEnvelope, socket: Socket | null): number {
    const eventName = this.resolveEventName(envelope.target, envelope.command);
    const recipients = this.pickRecipients(envelope.target, envelope.targetInstanceId);

    // Verificar si el target es un dispositivo HTTP (Arduino)
    const isHttpDevice = recipients.length > 0 && recipients[0].transport === "http";

    if (isHttpDevice) {
      // Enviar comando HTTP al Arduino
      this.sendHttpCommand(envelope, recipients);
      return recipients.length;
    }

    // Envío normal vía WebSocket
    for (const recipient of recipients) {
      if (recipient.socket) {
        recipient.socket.emit(eventName, envelope.payload);
      }
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

    // Emit event only once
    this.bus.emit(SERVER_EVENTS.DIRECT_EXECUTED, historyEntry);

    // Update sender's lastSeenAt if this came from a socket
    if (socket) {
      const sender = this.deviceManager.findBySocketId(socket.id);
      if (sender) {
        sender.lastSeenAt = Date.now();
      }
    }

    return recipients.length;
  }

  private sendHttpCommand(envelope: DirectExecuteEnvelope, recipients: any[]): void {
    if (!this.arduinoBridge) {
      logger.error("[DirectRouter] ArduinoBridge not set, cannot send HTTP command");
      return;
    }

    // Solo soportar comandos "start" y "reset" (reset = restart)
    const command = envelope.command;
    if (command !== "start" && command !== "reset") {
      logger.warn(
        `[DirectRouter] Unsupported HTTP command for Arduino: ${command}. Only 'start' and 'reset' are supported.`
      );
      return;
    }

    const arduinoCommand = command === "reset" ? "restart" : command;

    for (const recipient of recipients) {
      this.arduinoBridge
        .sendCommandToArduino(recipient.id, arduinoCommand as "start" | "restart")
        .then(() => {
          logger.info(
            `[DirectRouter] HTTP command "${arduinoCommand}" sent successfully to ${recipient.id}`
          );

          const historyEntry = {
            envelope: { ...envelope, command: arduinoCommand },
            eventName: `arduino:command:${arduinoCommand}`,
            recipients: [
              {
                id: recipient.id,
                socketId: recipient.socketId,
                instanceId: recipient.instanceId,
                connectedAt: recipient.connectedAt,
                lastSeenAt: recipient.lastSeenAt,
                transport: recipient.transport,
                metadata: recipient.metadata,
                registered: recipient.registered,
                latencyMs: recipient.latencyMs
              }
            ]
          };

          this.bus.emit(SERVER_EVENTS.DIRECT_EXECUTED, historyEntry);
        })
        .catch((error: any) => {
          logger.error(
            `[DirectRouter] Failed to send HTTP command to ${recipient.id}: ${error.message}`
          );
        });
    }
  }

  private resolveEventName(target: DeviceId, command: string): string {
    const events = DEVICE_COMMAND_EVENTS[target] as Record<string, string> | undefined;
    const eventName = events?.[command];
    return eventName ?? command;
  }

  private pickRecipients(target: DeviceId, instanceId?: string) {
    const sessions = this.deviceManager.getDeviceSessions(target);
    if (!instanceId) {
      return sessions;
    }

    return sessions.filter((session) => session.instanceId === instanceId);
  }
}
