import { STATUS_EVENTS, type StatusPayload } from "@samay/scape-protocol";
import type { Socket } from "socket.io";
import { StorageManager } from "./storageManager.js";
import { logger } from "../utils/logger.js";

interface TimerState {
  durationMs: number;
  startedAt?: number;
  remainingMs: number;
  phase: "idle" | "running" | "paused" | "won";
}

export class StatusManager {
  private state: TimerState = {
    durationMs: 60 * 60 * 1000,
    remainingMs: 60 * 60 * 1000,
    phase: "idle"
  };

  private ticker: NodeJS.Timeout | null = null;

  constructor(private readonly storage: StorageManager) {}

  attach(socket: Socket): void {
    socket.on(STATUS_EVENTS.START, (payload?: StatusPayload & { durationSeconds?: number }) => {
      this.start(payload);
    });

    socket.on(STATUS_EVENTS.PAUSE, (payload?: StatusPayload) => {
      this.pause(payload);
    });

    socket.on(STATUS_EVENTS.RESTART, (payload?: StatusPayload & { durationSeconds?: number }) => {
      this.restart(payload);
    });

    socket.on(STATUS_EVENTS.WIN, (payload?: StatusPayload) => {
      this.win(payload);
    });
  }

  private start(payload?: StatusPayload & { durationSeconds?: number }): void {
    const durationMs = this.resolveDuration(payload?.durationSeconds);
    const startedAt = payload?.at ?? Date.now();

    this.state = {
      durationMs,
      startedAt,
      remainingMs: durationMs,
      phase: "running"
    };

    this.startTicker();
    this.pushState({ note: payload?.note, operator: payload?.operator });
    logger.info(`[StatusManager] Escape started with duration ${Math.round(durationMs / 1000)}s`);
  }

  private pause(payload?: StatusPayload): void {
    if (this.state.phase !== "running") {
      return;
    }

    this.stopTicker();
    const elapsed = this.computeElapsed();
    const remainingMs = Math.max(this.state.durationMs - elapsed, 0);

    this.state = {
      ...this.state,
      remainingMs,
      phase: "paused"
    };

    this.pushState({ note: payload?.note, operator: payload?.operator });
    logger.info(`[StatusManager] Escape paused with ${Math.round(remainingMs / 1000)}s remaining`);
  }

  private restart(payload?: StatusPayload & { durationSeconds?: number }): void {
    this.stopTicker();
    const durationMs = this.resolveDuration(payload?.durationSeconds) ?? this.state.durationMs;

    this.state = {
      durationMs,
      startedAt: payload?.at ?? Date.now(),
      remainingMs: durationMs,
      phase: "running"
    };

    this.startTicker();
    this.pushState({ note: payload?.note, operator: payload?.operator });
    logger.info(`[StatusManager] Escape restarted`);
  }

  private win(payload?: StatusPayload): void {
    this.stopTicker();
    const elapsed = this.computeElapsed();
    const remainingMs = Math.max(this.state.durationMs - elapsed, 0);

    this.state = {
      ...this.state,
      remainingMs,
      phase: "won"
    };

    this.pushState({ note: payload?.note, operator: payload?.operator });
    logger.info(`[StatusManager] Escape completed`);
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      const elapsed = this.computeElapsed();
      const remainingMs = Math.max(this.state.durationMs - elapsed, 0);

      if (remainingMs <= 0) {
        this.stopTicker();
        this.state = {
          ...this.state,
          remainingMs: 0,
          phase: "won"
        };
        this.pushState();
        logger.info(`[StatusManager] Escape completed (timer)`);
        return;
      }

      this.state = {
        ...this.state,
        remainingMs
      };

      this.pushState();
    }, 1000);
  }

  private stopTicker(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private computeElapsed(): number {
    if (!this.state.startedAt) {
      return 0;
    }
    return Math.max(Date.now() - this.state.startedAt, 0);
  }

  private resolveDuration(durationSeconds?: number): number {
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      return durationSeconds * 1000;
    }
    return this.state.durationMs || 60 * 60 * 1000;
  }

  private pushState(extra?: { operator?: string; note?: string }): void {
    this.storage.patch({
      status: {
        phase: this.state.phase,
        operator: extra?.operator,
        note: extra?.note,
        updatedAt: Date.now()
      },
      timer: {
        totalMs: this.state.durationMs,
        remainingMs: this.state.remainingMs,
        startedAt: this.state.startedAt,
        phase: this.state.phase
      }
    });
  }
}
