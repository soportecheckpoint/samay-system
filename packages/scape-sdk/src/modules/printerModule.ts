import type { Socket } from "socket.io-client";
import { PRINTER_EVENTS, type PrintPayload } from "@samay/scape-protocol";
import type { PrinterModule } from "../types.js";

export class PrinterModuleImpl implements PrinterModule {
  private readonly socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  print(payload?: PrintPayload): void {
    this.socket.emit(PRINTER_EVENTS.PRINT, payload ?? {});
  }
}
