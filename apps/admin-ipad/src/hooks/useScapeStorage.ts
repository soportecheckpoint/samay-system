import { useEffect } from "react";
import { useScapeSdk } from "@samay/scape-sdk";
import { DEVICE, type AdminStateSnapshot } from "@samay/scape-protocol";
import { useAdminStore } from "../store.ts";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const STORAGE_KEYS = ["adminState"] as const;

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

export function useScapeStorage() {
  const { sdk, connectionState, retry } = useScapeSdk({
    createOptions: {
      device: DEVICE.ADMIN,
      url: SERVER_URL
    },
    connectOnMount: true
  });

  const hydrateAdminState = useAdminStore((state) => state.hydrateAdminState);
  const setConnected = useAdminStore((state) => state.setConnected);

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
    }, { keys: [...STORAGE_KEYS] });

    return () => {
      try {
        unsubscribe();
      } catch {
        // Ignore unsubscribe errors to avoid interrupting the unmount flow
      }
    };
  }, [sdk, connectionState.status, hydrateAdminState]);

  return {
    isConnected: connectionState.status === "connected",
    connectionState,
    retry
  };
}