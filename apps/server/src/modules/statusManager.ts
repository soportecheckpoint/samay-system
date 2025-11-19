import { STATUS_EVENTS, type StatusPayload } from "@samay/scape-protocol";
import type { Socket } from "socket.io";
import { StorageManager } from "./storageManager.js";
import { logger } from "../utils/logger.js";

interface TimerState {
  durationMs: number;
  startedAt?: number | null;
  remainingMs: number;
  phase: "idle" | "running" | "paused" | "won" | "lost";
}

const DEFAULT_DURATION_MS = 40 * 60 * 1000;

export class StatusManager {
  private state: TimerState = {
    durationMs: DEFAULT_DURATION_MS,
    remainingMs: DEFAULT_DURATION_MS,
    phase: "idle"
  };

  private ticker: NodeJS.Timeout | null = null;

  constructor(private readonly storage: StorageManager) {
    this.bootstrap();
  }

  private bootstrap(): void {
    const snapshot = this.storage.getState();
    const patch: Record<string, unknown> = {};

    if (!snapshot.status) {
      patch.status = {
        phase: "idle",
        updatedAt: Date.now()
      };
    }

    if (!snapshot.timer) {
      patch.timer = {
        totalMs: this.state.durationMs,
        remainingMs: this.state.remainingMs,
        startedAt: null,
        phase: "idle"
      };
    }

    if (Object.keys(patch).length > 0) {
      this.storage.patch(patch);
    }
  }

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

    socket.on(STATUS_EVENTS.LOSE, (payload?: StatusPayload) => {
      this.lose(payload);
    });
  }

  reset(): void {
    this.stopTicker();
    const durationMs = this.state.durationMs || DEFAULT_DURATION_MS;

    this.state = {
      durationMs,
      remainingMs: durationMs,
      startedAt: null,
      phase: "idle"
    };

    this.pushState();
    logger.info(`[StatusManager] State reset`);
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
    if (this.state.phase === "running") {
      this.stopTicker();
      const elapsed = this.computeElapsed();
      const remainingMs = Math.max(this.state.durationMs - elapsed, 0);

      this.state = {
        ...this.state,
        remainingMs,
        startedAt: null,
        phase: "paused"
      };

      this.pushState({ note: payload?.note, operator: payload?.operator });
      logger.info(`[StatusManager] Escape paused with ${Math.round(remainingMs / 1000)}s remaining`);
      return;
    }

    if (this.state.phase === "paused") {
      this.resume(payload);
    }
  }

  private resume(payload?: StatusPayload): void {
    if (this.state.phase !== "paused") {
      return;
    }

    const elapsedBeforePause = Math.max(this.state.durationMs - this.state.remainingMs, 0);
    const startedAt = Math.max((payload?.at ?? Date.now()) - elapsedBeforePause, 0);

    this.state = {
      ...this.state,
      startedAt,
      phase: "running"
    };

    this.startTicker();
    this.pushState({ note: payload?.note, operator: payload?.operator });
    logger.info(`[StatusManager] Escape resumed with ${Math.round(this.state.remainingMs / 1000)}s remaining`);
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
    this.finalizeOutcome("won", payload);
    logger.info(`[StatusManager] Escape completed`);
  }

  private lose(payload?: StatusPayload): void {
    this.stopTicker();
    this.finalizeOutcome("lost", payload);
    logger.warn(`[StatusManager] Escape failed`);
  }

  private finalizeOutcome(phase: "won" | "lost", payload?: StatusPayload): void {
    const elapsed = this.computeElapsed();
    const remainingMs = Math.max(this.state.durationMs - elapsed, 0);

    this.state = {
      ...this.state,
      remainingMs,
      phase
    };

    this.pushState({ note: payload?.note, operator: payload?.operator });
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      const elapsed = this.computeElapsed();
      const remainingMs = Math.max(this.state.durationMs - elapsed, 0);

      if (remainingMs <= 0) {
        this.stopTicker();
        this.finalizeOutcome("lost", { note: "timer-expired", operator: "system" });
        logger.warn(`[StatusManager] Escape failed (timer)`);
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
    return this.state.durationMs || DEFAULT_DURATION_MS;
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
        startedAt: this.state.startedAt ?? null,
        phase: this.state.phase
      }
    });
  }
}
