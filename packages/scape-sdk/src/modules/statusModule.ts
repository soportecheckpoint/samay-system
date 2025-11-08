import type { Socket } from "socket.io-client";
import { STATUS_EVENTS, type StatusPayload } from "@samay/scape-protocol";
import type { StatusModule } from "../types.js";

export class StatusModuleImpl implements StatusModule {
  private readonly socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  start(payload?: StatusPayload): void {
    this.socket.emit(STATUS_EVENTS.START, payload ?? {});
  }

  pause(payload?: StatusPayload): void {
    this.socket.emit(STATUS_EVENTS.PAUSE, payload ?? {});
  }

  restart(payload?: StatusPayload): void {
    this.socket.emit(STATUS_EVENTS.RESTART, payload ?? {});
  }

  win(payload?: StatusPayload): void {
    this.socket.emit(STATUS_EVENTS.WIN, payload ?? {});
  }

  lose(payload?: StatusPayload): void {
    this.socket.emit(STATUS_EVENTS.LOSE, payload ?? {});
  }
}
