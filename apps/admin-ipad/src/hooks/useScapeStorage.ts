import { useEffect } from "react";
import { useScapeSdk } from "@samay/scape-sdk";
import { DEVICE, type AdminStateSnapshot } from "@samay/scape-protocol";
import { useAdminStore } from "../store.ts";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const STORAGE_KEYS = ["adminState", "timer", "status"] as const;

const isAdminStateSnapshot = (value: unknown): value is AdminStateSnapshot => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as AdminStateSnapshot;
  return (
    Array.isArray(snapshot.devices) &&
    Array.isArray(snapshot.events) &&
    Array.isArray(snapshot.heartbeats) &&
    typeof snapshot.updatedAt === "number"
  );
};

type TimerSnapshot = {
  totalMs?: number;
  remainingMs?: number;
  startedAt?: number | null;
  phase?: string;
};

type StatusSnapshot = {
  phase?: string;
  updatedAt?: number;
};

const isTimerSnapshot = (value: unknown): value is TimerSnapshot => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as TimerSnapshot & { totalMs?: unknown; remainingMs?: unknown; phase?: unknown; startedAt?: unknown };
  return (
    (typeof snapshot.totalMs === "number" || snapshot.totalMs === undefined) &&
    (typeof snapshot.remainingMs === "number" || snapshot.remainingMs === undefined) &&
    (typeof snapshot.startedAt === "number" || snapshot.startedAt === null || snapshot.startedAt === undefined) &&
    (typeof snapshot.phase === "string" || snapshot.phase === undefined)
  );
};

const isStatusSnapshot = (value: unknown): value is StatusSnapshot => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as StatusSnapshot & { phase?: unknown; updatedAt?: unknown };
  return (
    (typeof snapshot.phase === "string" || snapshot.phase === undefined) &&
    (typeof snapshot.updatedAt === "number" || snapshot.updatedAt === undefined)
  );
};

export function useScapeStorage() {
  const { sdk, connectionState, retry, lastResetPayload } = useScapeSdk({
    createOptions: {
      device: DEVICE.ADMIN,
      url: SERVER_URL
    },
    connectOnMount: true
  });

  const hydrateAdminState = useAdminStore((state) => state.hydrateAdminState);
  const setConnected = useAdminStore((state) => state.setConnected);
  const updateTimer = useAdminStore((state) => state.updateTimer);
  const updateStatus = useAdminStore((state) => state.updateStatus);

  useEffect(() => {
    setConnected(connectionState.status === "connected");
  }, [connectionState.status, setConnected]);

  useEffect(() => {
    if (connectionState.status !== "connected") {
      return;
    }

    const unsubscribe = sdk.storage.subscribe((payload) => {
      const snapshot = payload.state?.adminState;
      if (isAdminStateSnapshot(snapshot)) {
        hydrateAdminState(snapshot);
      }

      const timerSnapshot = payload.state?.timer;
      if (isTimerSnapshot(timerSnapshot)) {
        updateTimer(timerSnapshot);
      }

      const statusSnapshot = payload.state?.status;
      if (isStatusSnapshot(statusSnapshot)) {
        updateStatus(statusSnapshot);
      }
    }, { keys: [...STORAGE_KEYS] });

    return () => {
      try {
        unsubscribe();
      } catch {
        // Ignore unsubscribe errors to avoid interrupting the unmount flow
      }
    };
  }, [sdk, connectionState.status, hydrateAdminState, updateTimer, updateStatus]);

  useEffect(() => {
    if (!lastResetPayload) {
      return;
    }

    const rawTargets = (lastResetPayload.metadata as { targets?: unknown } | undefined)?.targets;
    const targets = Array.isArray(rawTargets) ? rawTargets : [];

    if (targets.length > 0) {
      return;
    }

    updateTimer(null);
    updateStatus({ phase: "waiting", updatedAt: Date.now() });
  }, [lastResetPayload, updateTimer, updateStatus]);

  return {
    isConnected: connectionState.status === "connected",
    connectionState,
    retry
  };
}