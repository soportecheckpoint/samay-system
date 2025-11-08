import { join } from "path";
import { PRINTER_EVENTS, type PrintPayload } from "@samay/scape-protocol";
import type { Socket } from "socket.io";
import { printPDF } from "../services/printer.js";
import { logger } from "../utils/logger.js";

interface PrintAck {
  ok: boolean;
  error?: string;
}

export class PrinterManager {
  private readonly defaultDocument: string;

  constructor() {
    const defaultPath = process.env.PRINTER_DEFAULT_DOC ?? join(process.cwd(), "to-print", "to-print.pdf");
    this.defaultDocument = defaultPath;
  }

  attach(socket: Socket): void {
    socket.on(PRINTER_EVENTS.PRINT, async (payload: PrintPayload | undefined, ack?: (response: PrintAck) => void) => {
      try {
        await this.handlePrint(payload);
        ack?.({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[PrinterManager] Print failed: ${message}`);
        ack?.({ ok: false, error: message });
      }
    });
  }

  private async handlePrint(payload?: PrintPayload): Promise<void> {
    const document = payload?.document ?? this.defaultDocument;
    const printerName = process.env.PRINTER_NAME || undefined;

    logger.info(`[PrinterManager] Printing document: ${document}`);
    if (printerName) {
      logger.info(`[PrinterManager] Target printer: ${printerName}`);
    }

    await printPDF(document, printerName);
  }
}
