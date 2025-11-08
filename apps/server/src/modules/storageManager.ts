import {
  STORAGE_EVENTS,
  type StorageModifyOptions,
  type StorageModifyPayload,
  type StorageSnapshot,
  type StorageSubscribePayload,
  type StorageUpdatePayload
} from "@samay/scape-protocol";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Server, Socket } from "socket.io";
import { SERVER_EVENTS, ServerEventBus } from "../app/events.js";
import { logger } from "../utils/logger.js";

interface Subscription {
  socket: Socket;
  keys?: string[];
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const PERSISTENCE_FILE = path.join(DATA_DIR, "storage-state.json");

interface PersistentStoragePayload {
  keys?: unknown;
  state?: unknown;
}

interface StoredSnapshotFile {
  keys: string[];
  state: StorageSnapshot;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
};

export class StorageManager {
  private readonly subscriptions = new Map<string, Subscription>();
  private state: StorageSnapshot = {};
  private readonly persistentKeys = new Set<string>();
  private readonly persistencePath = PERSISTENCE_FILE;
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly io: Server,
    private readonly bus: ServerEventBus
  ) {
    this.loadPersistentState();
  }

  private loadPersistentState(): void {
    try {
      const raw = readFileSync(this.persistencePath, "utf-8");
      const payload = JSON.parse(raw) as PersistentStoragePayload;

      const persistedKeys = normalizeStringArray(payload?.keys);
      persistedKeys.forEach((key) => this.persistentKeys.add(key));

      if (isRecord(payload?.state)) {
        const persistedState = { ...payload.state } as StorageSnapshot;
        this.state = {
          ...this.state,
          ...persistedState
        };
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code && code !== "ENOENT") {
        logger.error("[StorageManager] Failed to load persistent storage", { error });
      }
    }
  }

  private schedulePersist(): void {
    if (!this.persistentKeys.size) {
      return;
    }

    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.writePersistentSnapshot();
    }, 50);
  }

  private async writePersistentSnapshot(): Promise<void> {
    const keys = Array.from(this.persistentKeys);
    if (!keys.length) {
      return;
    }

    const state: StorageSnapshot = {};
    for (const key of keys) {
      if (key in this.state) {
        state[key] = this.state[key];
      }
    }

    const payload: StoredSnapshotFile = {
      keys,
      state
    };

    try {
      await mkdir(DATA_DIR, { recursive: true });
      const json = JSON.stringify(payload, null, 2);
      await writeFile(this.persistencePath, json, "utf-8");
    } catch (error) {
      logger.error("[StorageManager] Failed to persist storage state", { error });
    }
  }

  private resolvePersistenceTargets(
    patch: Record<string, unknown>,
    options?: StorageModifyOptions
  ): string[] {
    if (!options) {
      return [];
    }

    const fromOptions = normalizeStringArray(options.persistKeys);
    if (fromOptions.length > 0) {
      return Array.from(new Set(fromOptions.filter((key) => key in patch)));
    }

    if (options.persist === true) {
      return Object.keys(patch);
    }

    return [];
  }

  attach(socket: Socket): void {
    socket.on(STORAGE_EVENTS.MODIFY, (payload: StorageModifyPayload) => {
      this.modify(payload, socket.id);
    });

    socket.on(STORAGE_EVENTS.SUBSCRIBE, (payload: StorageSubscribePayload = {}) => {
      this.subscribe(socket, payload);
    });

    socket.on(STORAGE_EVENTS.UNSUBSCRIBE, () => {
      this.unsubscribe(socket.id);
    });

    socket.on("disconnect", () => {
      this.unsubscribe(socket.id);
    });
  }

  getState(): StorageSnapshot {
    return { ...this.state };
  }

  patch(
    patch: Record<string, unknown>,
    options?: StorageModifyOptions,
    source?: string
  ): void {
    const payload: StorageModifyPayload = { patch };

    if (options?.persist === true) {
      payload.persist = true;
    }

    if (options?.persistKeys?.length) {
      payload.persistKeys = options.persistKeys;
    }

    this.modify(payload, source ?? "server");
  }

  private subscribe(socket: Socket, payload: StorageSubscribePayload): void {
    this.subscriptions.set(socket.id, {
      socket,
      keys: payload.keys?.length ? payload.keys : undefined
    });

    const update = this.createUpdate(payload.keys);
    socket.emit(STORAGE_EVENTS.UPDATE, update);
  }

  private unsubscribe(socketId: string): void {
    this.subscriptions.delete(socketId);
  }

  private modify(payload: StorageModifyPayload, sourceId: string): void {
    const { patch } = payload;
    if (!patch || typeof patch !== "object") {
      return;
    }

    const requestedPersistentKeys = this.resolvePersistenceTargets(patch, payload);
    const changedKeys: string[] = [];
    const nextState: StorageSnapshot = { ...this.state };

    for (const [key, value] of Object.entries(patch)) {
      if (!Object.is(this.state[key], value)) {
        changedKeys.push(key);
      }
      nextState[key] = value;
    }

    if (changedKeys.length === 0) {
      if (requestedPersistentKeys.length > 0) {
        requestedPersistentKeys.forEach((key) => this.persistentKeys.add(key));
        if (requestedPersistentKeys.some((key) => key in this.state)) {
          this.schedulePersist();
        }
      }
      return;
    }

    this.state = nextState;

    const update: StorageUpdatePayload = {
      state: this.getState(),
      changedKeys
    };

    for (const { socket, keys } of this.subscriptions.values()) {
      if (keys && !keys.some((key) => changedKeys.includes(key))) {
        continue;
      }
      socket.emit(STORAGE_EVENTS.UPDATE, update);
    }

    this.bus.emit(SERVER_EVENTS.STORAGE_UPDATED, update);

    if (requestedPersistentKeys.length > 0) {
      requestedPersistentKeys.forEach((key) => this.persistentKeys.add(key));
    }

    if (changedKeys.some((key) => this.persistentKeys.has(key))) {
      this.schedulePersist();
    }
  }

  private createUpdate(keys?: string[]): StorageUpdatePayload {
    if (!keys || keys.length === 0) {
      return {
        state: this.getState()
      };
    }

    const state: StorageSnapshot = {};
    for (const key of keys) {
      state[key] = this.state[key];
    }

    return {
      state,
      changedKeys: keys
    };
  }
}
