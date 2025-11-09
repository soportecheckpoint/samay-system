import type {
  CommandPayloadArgs,
  DeviceCommandName,
  DeviceConnectionSummary,
  DeviceId,
  DirectCommandPayload,
  ExecuteTarget,
  DeviceLatencyPayload,
  MonitorEventPayload,
  MonitorLatencyPayload,
  MonitorHistoryPayload,
  PrintPayload,
  ResetPayload,
  StatusPayload,
  StorageModifyPayload,
  StorageModifyOptions,
  StorageSubscribePayload,
  StorageUpdatePayload,
  UnregisteredDevicePayload
} from "@samay/scape-protocol";
import type { ManagerOptions, Socket, SocketOptions } from "socket.io-client";
import type { SocketFactory } from "./core/socketFactory.js";

export type ConnectionStatus = "connecting" | "connected" | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  attempt: number;
  lastError: string | null;
  disconnectReason: string | null;
}

export interface ConnectionModule {
  getState(): ConnectionState;
  subscribe(handler: (state: ConnectionState) => void): () => void;
  retry(): void;
}

export interface CreateSdkOptions<TDevice extends DeviceId = DeviceId> {
  url: string;
  device: TDevice;
  instanceId?: string;
  metadata?: Record<string, unknown>;
  autoConnect?: boolean;
  transport?: "socket" | "http";
  socketOptions?: Partial<ManagerOptions & SocketOptions>;
}

export interface DirectModule<TDevice extends DeviceId> {
  execute<TTarget extends DeviceId>(target: TTarget): ExecuteTarget<TTarget>;
  on<TCommand extends DeviceCommandName<TDevice>>(
    command: TCommand,
    handler: (...args: CommandPayloadArgs<DirectCommandPayload<TDevice, TCommand>>) => void
  ): () => void;
  off<TCommand extends DeviceCommandName<TDevice>>(
    command: TCommand,
    handler: (...args: CommandPayloadArgs<DirectCommandPayload<TDevice, TCommand>>) => void
  ): void;
  send<TTarget extends DeviceId>(
    target: TTarget,
    command: string,
    payload?: unknown,
    options?: { targetInstanceId?: string }
  ): void;
}

export interface StorageModule {
  modify(patch: StorageModifyPayload["patch"], options?: StorageModifyOptions): void;
  subscribe(
    handler: (payload: StorageUpdatePayload) => void,
    options?: StorageSubscribePayload
  ): () => void;
}

export interface StatusModule {
  start(payload?: StatusPayload): void;
  pause(payload?: StatusPayload): void;
  restart(payload?: StatusPayload): void;
  win(payload?: StatusPayload): void;
  lose(payload?: StatusPayload): void;
}

export interface DevicesModule {
  onList(handler: (payload: DeviceConnectionSummary[]) => void): () => void;
  onLatency(handler: (payload: DeviceLatencyPayload) => void): () => void;
  onUnregistered(handler: (payload: UnregisteredDevicePayload) => void): () => void;
}

export interface MonitorModule {
  onEvent(handler: (payload: MonitorEventPayload) => void): () => void;
  onLatency(handler: (payload: MonitorLatencyPayload) => void): () => void;
  onHistory(handler: (payload: MonitorHistoryPayload) => void): () => void;
}

export interface PrinterModule {
  print(payload?: PrintPayload): void;
}

export type ResetHandler = (payload: ResetPayload) => void;

export interface ResetOptions {
  broadcast?: boolean;
}

export interface CoreSocketApi {
  connect(): Socket;
  disconnect(): Socket;
  isConnected(): boolean;
  on: Socket["on"];
  off: Socket["off"];
  once: Socket["once"];
  emit: Socket["emit"];
}

export interface ScapeSdk<TDevice extends DeviceId = DeviceId> {
  socket: Socket;
  device: TDevice;
  instanceId: string;
  direct: DirectModule<TDevice>;
  storage: StorageModule;
  status: StatusModule;
  devices: DevicesModule;
  monitor: MonitorModule;
  printer: PrinterModule;
  core: CoreSocketApi;
  reset(payload?: ResetPayload, options?: ResetOptions): void;
  onReset(handler: ResetHandler): () => void;
  connection: ConnectionModule;
}

export interface ClientDependencies {
  factory?: SocketFactory;
}
