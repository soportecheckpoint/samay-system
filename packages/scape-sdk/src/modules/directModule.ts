import type { Socket } from "socket.io-client";
import {
  DEVICE_COMMAND_EVENTS,
  ROUTER_EVENTS,
  type CommandPayloadArgs,
  type DeviceCommandName,
  type DeviceEventRegistry,
  type DeviceId,
  type DirectCommandPayload,
  type ExecuteTarget
} from "@samay/scape-protocol";
import { HandlerRegistry } from "../core/handlerRegistry.js";
import type { DirectModule as DirectModuleApi } from "../types.js";

const getEventName = <TTarget extends DeviceId, TCommand extends DeviceCommandName<TTarget>>(
  registry: DeviceEventRegistry,
  target: TTarget,
  command: TCommand
) => {
  const events = registry[target] as Record<string, string> | undefined;
  const eventName = events?.[String(command)];

  if (!eventName) {
    throw new Error(`Unknown command "${String(command)}" for device "${target}"`);
  }

  return eventName;
};

const wrapHandler = <TDevice extends DeviceId, TCommand extends DeviceCommandName<TDevice>>(
  handler: (...args: CommandPayloadArgs<DirectCommandPayload<TDevice, TCommand>>) => void
) => {
  return (payload?: unknown) => {
    if (payload === undefined) {
      (handler as () => void)();
      return;
    }

    (handler as (value: unknown) => void)(payload);
  };
};

export class DirectModuleImpl<TDevice extends DeviceId> implements DirectModuleApi<TDevice> {
  private readonly socket: Socket;
  private readonly device: TDevice;
  private readonly instanceId: string;
  private readonly registry: HandlerRegistry;
  private readonly events: DeviceEventRegistry;

  constructor(
    socket: Socket,
    device: TDevice,
    instanceId: string,
    registry?: HandlerRegistry,
    events?: DeviceEventRegistry
  ) {
    this.socket = socket;
    this.device = device;
    this.instanceId = instanceId;
    this.registry = registry ?? new HandlerRegistry();
    this.events = events ?? DEVICE_COMMAND_EVENTS;
  }

  execute<TTarget extends DeviceId>(target: TTarget): ExecuteTarget<TTarget> {
    const events = this.events[target];
    if (!events || Object.keys(events).length === 0) {
      return {} as ExecuteTarget<TTarget>;
    }

    const commands = {} as ExecuteTarget<TTarget>;
    const eventEntries = Object.keys(events) as Array<DeviceCommandName<TTarget>>;

    for (const commandKey of eventEntries) {
      commands[commandKey] = ((payload?: unknown) => {
        this.socket.emit(ROUTER_EVENTS.EXECUTE, {
          target,
          command: commandKey,
          payload,
          source: this.device,
          sourceInstanceId: this.instanceId
        });
      }) as ExecuteTarget<TTarget>[typeof commandKey];
    }

    return commands;
  }

  on<TCommand extends DeviceCommandName<TDevice>>(
    command: TCommand,
    handler: (...args: CommandPayloadArgs<DirectCommandPayload<TDevice, TCommand>>) => void
  ) {
    const eventName = getEventName(this.events, this.device, command);
    const key = this.keyFor(command);
    const wrapped = wrapHandler(handler);

    this.registry.register(key, handler as (...args: unknown[]) => void, wrapped);
    this.socket.on(eventName, wrapped);

    return () => this.off(command, handler);
  }

  off<TCommand extends DeviceCommandName<TDevice>>(
    command: TCommand,
    handler: (...args: CommandPayloadArgs<DirectCommandPayload<TDevice, TCommand>>) => void
  ): void {
    const eventName = getEventName(this.events, this.device, command);
    const key = this.keyFor(command);
    const wrapped = this.registry.resolve(key, handler as (...args: unknown[]) => void);

    if (wrapped) {
      this.socket.off(eventName, wrapped);
      this.registry.unregister(key, handler as (...args: unknown[]) => void);
    }
  }

  private keyFor(command: DeviceCommandName<TDevice>) {
    return `${this.device}:${String(command)}`;
  }
}
