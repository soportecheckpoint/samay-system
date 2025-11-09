import type { Socket } from "socket.io-client";
import {
  ROUTER_EVENTS,
  SDK_EVENTS,
  type DeviceId,
  type DeviceLatencyPingPayload,
  type DeviceLatencyPongPayload,
  type ResetPayload
} from "@samay/scape-protocol";
import { HandlerRegistry } from "./core/handlerRegistry.js";
import { defaultSocketFactory } from "./core/socketFactory.js";
import type { SocketFactory } from "./core/socketFactory.js";
import {
  type CoreSocketApi,
  type CreateSdkOptions,
  type ConnectionModule,
  type ConnectionState,
  type DevicesModule,
  type DirectModule,
  type MonitorModule,
  type PrinterModule,
  type ResetHandler,
  type ResetOptions,
  type ScapeSdk,
  type StorageModule,
  type StatusModule,
  type ClientDependencies
} from "./types.js";
import { DirectModuleImpl } from "./modules/directModule.js";
import { StorageModuleImpl } from "./modules/storageModule.js";
import { StatusModuleImpl } from "./modules/statusModule.js";
import { DevicesModuleImpl } from "./modules/devicesModule.js";
import { MonitorModuleImpl } from "./modules/monitorModule.js";
import { PrinterModuleImpl } from "./modules/printerModule.js";

const normalizeError = (error: unknown): string => {
  if (!error) {
    return "unknown-error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message || "unknown-error";
  }

  if (typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "unknown-error";
  }
};

const generateInstanceId = () => {
  const globalCrypto = globalThis.crypto as Crypto | undefined;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }

  return `sdk-${Math.random().toString(36).slice(2, 10)}`;
};

export class ScapeClient<TDevice extends DeviceId> implements ScapeSdk<TDevice> {
  public readonly socket: Socket;
  public readonly device: TDevice;
  public readonly instanceId: string;
  public readonly direct: DirectModule<TDevice>;
  public readonly storage: StorageModule;
  public readonly status: StatusModule;
  public readonly devices: DevicesModule;
  public readonly monitor: MonitorModule;
  public readonly printer: PrinterModule;
  public readonly core: CoreSocketApi;
  public readonly connection: ConnectionModule;

  private readonly metadata?: Record<string, unknown>;
  private readonly transport: "socket" | "http";
  private connectionState: ConnectionState;
  private readonly connectionListeners = new Set<(state: ConnectionState) => void>();
  private readonly resetListeners = new Set<ResetHandler>();
  private readonly handleResetEvent = (payload?: ResetPayload) => {
    const normalized = this.normalizeResetPayload(payload, { includeSourceDefaults: false });
    if (normalized.sourceInstanceId && normalized.sourceInstanceId === this.instanceId) {
      return;
    }
    this.notifyReset(normalized);
  };
  private readonly handleLatencyPing = (payload: DeviceLatencyPingPayload) => {
    if (!payload || typeof payload.pingId !== "string") {
      return;
    }

    const respondedAt = Date.now();
    const pong: DeviceLatencyPongPayload = {
      pingId: payload.pingId,
      sentAt: typeof payload.sentAt === "number" ? payload.sentAt : respondedAt,
      respondedAt
    };

    try {
      this.socket.emit(ROUTER_EVENTS.LATENCY_PONG, pong);
    } catch {
      // Ignore emission errors to avoid interrupting the client flow
    }
  };

  constructor(
    options: CreateSdkOptions<TDevice>,
    dependencies: ClientDependencies = {}
  ) {
    const {
      url,
      device,
      metadata,
      instanceId,
      autoConnect = true,
      transport = "socket",
      socketOptions = {}
    } = options;

    this.device = device;
    this.instanceId = instanceId ?? generateInstanceId();
    this.metadata = metadata;
    this.transport = transport;
    const factory: SocketFactory = dependencies.factory ?? defaultSocketFactory;
    this.socket = factory(url, {
      autoConnect,
      transports: ["websocket"],
      ...socketOptions
    });

    const handlerRegistry = new HandlerRegistry();

    this.direct = new DirectModuleImpl(this.socket, this.device, this.instanceId, handlerRegistry);
    this.storage = new StorageModuleImpl(this.socket);
    this.status = new StatusModuleImpl(this.socket);
    this.devices = new DevicesModuleImpl(this.socket);
    this.monitor = new MonitorModuleImpl(this.socket);
    this.printer = new PrinterModuleImpl(this.socket);
    this.core = this.buildCoreApi();
    this.connectionState = {
      status: this.socket.connected ? "connected" : "connecting",
      attempt: 0,
      lastError: null,
      disconnectReason: null
    };
    this.connection = this.buildConnectionApi();
    this.socket.on(SDK_EVENTS.RESET, this.handleResetEvent);
    this.socket.on(ROUTER_EVENTS.LATENCY_PING, this.handleLatencyPing);

    this.socket.on("connect", () => {
      this.setConnectionState({
        status: "connected",
        attempt: 0,
        lastError: null,
        disconnectReason: null
      });
      this.register();
    });
    this.socket.on("disconnect", (reason) => {
      this.setConnectionState((prev) => ({
        status: "connecting",
        attempt: prev.attempt,
        lastError: prev.lastError,
        disconnectReason: typeof reason === "string" ? reason : prev.disconnectReason
      }));
    });
    this.socket.on("connect_error", (error) => {
      this.setConnectionState((prev) => ({
        status: "error",
        attempt: prev.attempt,
        lastError: normalizeError(error),
        disconnectReason: prev.disconnectReason
      }));
    });
    this.socket.on("error", (error) => {
      this.setConnectionState((prev) => ({
        status: "error",
        attempt: prev.attempt,
        lastError: normalizeError(error),
        disconnectReason: prev.disconnectReason
      }));
    });
    this.socket.on("reconnect_attempt", (attempt: number) => {
      this.setConnectionState((prev) => ({
        status: "connecting",
        attempt,
        lastError: prev.lastError,
        disconnectReason: prev.disconnectReason
      }));
    });
    this.socket.on("reconnect_error", (error) => {
      this.setConnectionState((prev) => ({
        status: "error",
        attempt: prev.attempt,
        lastError: normalizeError(error),
        disconnectReason: prev.disconnectReason
      }));
    });
    this.socket.on("reconnect_failed", () => {
      this.setConnectionState((prev) => ({
        status: "error",
        attempt: prev.attempt,
        lastError: prev.lastError ?? "reconnect_failed",
        disconnectReason: prev.disconnectReason
      }));
    });

    if (this.socket.connected) {
      this.setConnectionState({
        status: "connected",
        attempt: 0,
        lastError: null,
        disconnectReason: null
      });
      this.register();
    }
  }

  private buildCoreApi(): CoreSocketApi {
    return {
      connect: () => this.socket.connect(),
      disconnect: () => this.socket.disconnect(),
      isConnected: () => this.socket.connected,
      on: this.socket.on.bind(this.socket),
      off: this.socket.off.bind(this.socket),
      once: this.socket.once.bind(this.socket),
      emit: this.socket.emit.bind(this.socket)
    };
  }

  private notifyReset(payload: ResetPayload & { at: number; source?: DeviceId; sourceInstanceId?: string }): void {
    this.resetListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // Silently ignore reset listener errors to avoid cascading failures
      }
    });
  }

  private normalizeResetPayload(
    payload: ResetPayload | undefined,
    options: { includeSourceDefaults: boolean }
  ): ResetPayload & { at: number; source?: DeviceId; sourceInstanceId?: string } {
    const base: ResetPayload = {
      ...payload
    };

    if (options.includeSourceDefaults) {
      base.source = base.source ?? this.device;
      base.sourceInstanceId = base.sourceInstanceId ?? this.instanceId;
    }

    return {
      ...base,
      at: base.at ?? Date.now()
    };
  }

  private register(): void {
    this.socket.emit(ROUTER_EVENTS.REGISTER, {
      device: this.device,
      instanceId: this.instanceId,
      metadata: this.metadata,
      transport: this.transport
    });
  }

  public reset(payload?: ResetPayload, options?: ResetOptions): void {
    const normalized = this.normalizeResetPayload(payload, { includeSourceDefaults: true });
    if (options?.broadcast !== false) {
      this.socket.emit(SDK_EVENTS.RESET, normalized);
    }
    this.notifyReset(normalized);
  }

  public onReset(handler: ResetHandler): () => void {
    this.resetListeners.add(handler);
    return () => {
      this.resetListeners.delete(handler);
    };
  }

  private buildConnectionApi(): ConnectionModule {
    return {
      getState: () => this.connectionState,
      subscribe: (handler) => {
        this.connectionListeners.add(handler);
        handler(this.connectionState);
        return () => {
          this.connectionListeners.delete(handler);
        };
      },
      retry: () => this.retryConnection()
    };
  }

  private setConnectionState(
    next: ConnectionState | ((previous: ConnectionState) => ConnectionState)
  ): void {
    const resolved = typeof next === "function"
      ? (next as (previous: ConnectionState) => ConnectionState)(this.connectionState)
      : next;

    this.connectionState = {
      status: resolved.status,
      attempt: resolved.attempt,
      lastError: resolved.lastError,
      disconnectReason: resolved.disconnectReason
    };

    this.connectionListeners.forEach((listener) => {
      try {
        listener(this.connectionState);
      } catch {
        // Ignore subscriber errors to avoid interrupting the SDK flow
      }
    });
  }

  private retryConnection(): void {
    this.setConnectionState((previous) => ({
      status: "connecting",
      attempt: previous.attempt + 1,
      lastError: null,
      disconnectReason: null
    }));

    this.socket.connect();
  }
}

export const createSdk = <TDevice extends DeviceId>(
  options: CreateSdkOptions<TDevice>,
  dependencies?: ClientDependencies
): ScapeSdk<TDevice> => new ScapeClient(options, dependencies);
