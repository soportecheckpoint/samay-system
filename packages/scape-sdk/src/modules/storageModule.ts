import type { Socket } from "socket.io-client";
import {
  STORAGE_EVENTS,
  type StorageModifyPayload,
  type StorageModifyOptions,
  type StorageSubscribePayload,
  type StorageUpdatePayload
} from "@samay/scape-protocol";
import type { StorageModule } from "../types.js";

export class StorageModuleImpl implements StorageModule {
  private readonly socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  modify(patch: StorageModifyPayload["patch"], options?: StorageModifyOptions): void {
    const payload: StorageModifyPayload = { patch };

    if (options?.persistKeys?.length) {
      payload.persistKeys = options.persistKeys.filter((key): key is string => typeof key === "string");
    }

    if (options?.persist === true) {
      payload.persist = true;
    }

    this.socket.emit(STORAGE_EVENTS.MODIFY, payload);
  }

  subscribe(
    handler: (payload: StorageUpdatePayload) => void,
    options?: StorageSubscribePayload
  ): () => void {
    const subscribeOptions = options ?? {};
    this.socket.emit(STORAGE_EVENTS.SUBSCRIBE, subscribeOptions);

    const listener = (payload: StorageUpdatePayload) => handler(payload);
    this.socket.on(STORAGE_EVENTS.UPDATE, listener);

    return () => {
      this.socket.off(STORAGE_EVENTS.UPDATE, listener);
      this.socket.emit(STORAGE_EVENTS.UNSUBSCRIBE, subscribeOptions);
    };
  }
}
