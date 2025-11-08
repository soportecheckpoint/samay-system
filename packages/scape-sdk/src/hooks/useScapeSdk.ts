import { useCallback, useEffect, useMemo, useState } from "react";
import type { DeviceId, ResetPayload } from "@samay/scape-protocol";
import { createSdk } from "../ScapeClient.js";
import type {
  ClientDependencies,
  ConnectionState,
  CreateSdkOptions,
  ResetHandler,
  ScapeSdk
} from "../types.js";

type CacheEntry = {
  sdk: ScapeSdk<DeviceId>;
  refs: number;
  disconnectOnRelease: boolean;
};

const sdkCache = new Map<string, CacheEntry>();

const buildDefaultCacheKey = <TDevice extends DeviceId>(options: CreateSdkOptions<TDevice>) => {
  const device = String(options.device);
  const url = options.url ?? "";
  return `${device}:${url}`;
};

const acquireSdk = <TDevice extends DeviceId>(
  key: string,
  createOptions: CreateSdkOptions<TDevice>,
  dependencies: ClientDependencies | undefined,
  disconnectOnLastRelease: boolean
): ScapeSdk<TDevice> => {
  const existing = sdkCache.get(key);
  if (existing) {
    existing.refs += 1;
    existing.disconnectOnRelease = existing.disconnectOnRelease && disconnectOnLastRelease;
    return existing.sdk as ScapeSdk<TDevice>;
  }

  const sdk = createSdk<TDevice>(createOptions, dependencies);
  sdkCache.set(key, {
    sdk: sdk as ScapeSdk<DeviceId>,
    refs: 1,
    disconnectOnRelease: disconnectOnLastRelease
  });

  return sdk;
};

const releaseSdk = (key: string, sdk: ScapeSdk<DeviceId>) => {
  const entry = sdkCache.get(key);
  if (!entry || entry.sdk !== sdk) {
    return;
  }

  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs === 0) {
    if (entry.disconnectOnRelease) {
      try {
        entry.sdk.core.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    sdkCache.delete(key);
  }
};

export interface UseScapeSdkOptions<TDevice extends DeviceId> {
  createOptions: CreateSdkOptions<TDevice>;
  dependencies?: ClientDependencies;
  cacheKey?: string;
  disconnectOnLastRelease?: boolean;
  connectOnMount?: boolean;
  onReset?: ResetHandler | ResetHandler[];
}

export interface UseScapeSdkResult<TDevice extends DeviceId> {
  sdk: ScapeSdk<TDevice>;
  connectionState: ConnectionState;
  retry: () => void;
  lastResetPayload: (ResetPayload & { at: number; source?: DeviceId; sourceInstanceId?: string }) | null;
  addResetListener: (handler: ResetHandler) => () => void;
}

export const useScapeSdk = <TDevice extends DeviceId>(
  options: UseScapeSdkOptions<TDevice>
): UseScapeSdkResult<TDevice> => {
  const {
    createOptions,
    dependencies,
    cacheKey: providedKey,
    disconnectOnLastRelease = true,
    connectOnMount = true,
    onReset
  } = options;

  const cacheKey = providedKey ?? buildDefaultCacheKey(createOptions);

  const [sdkInstance] = useState(() =>
    acquireSdk(cacheKey, createOptions, dependencies, disconnectOnLastRelease)
  );

  useEffect(() => () => releaseSdk(cacheKey, sdkInstance as ScapeSdk<DeviceId>), [cacheKey, sdkInstance]);

  useEffect(() => {
    if (!connectOnMount) {
      return;
    }

    if (!sdkInstance.core.isConnected()) {
      sdkInstance.core.connect();
    }
  }, [connectOnMount, sdkInstance]);

  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    sdkInstance.connection.getState()
  );

  useEffect(() => sdkInstance.connection.subscribe(setConnectionState), [sdkInstance]);

  const retry = sdkInstance.connection.retry;

  const [lastResetPayload, setLastResetPayload] = useState<
    (ResetPayload & { at: number; source?: DeviceId; sourceInstanceId?: string }) | null
  >(null);

  const handleReset = useCallback(
    (payload: ResetPayload) => {
      setLastResetPayload((prev) => {
        const nextPayload = {
          ...payload,
          at: payload.at ?? Date.now()
        } as ResetPayload & { at: number; source?: DeviceId; sourceInstanceId?: string };

        if (prev && prev.at === nextPayload.at && prev.source === nextPayload.source && prev.sourceInstanceId === nextPayload.sourceInstanceId) {
          return prev;
        }

        return nextPayload;
      });
    },
    []
  );

  const normalizedResetHandlers = useMemo(() => {
    if (!onReset) {
      return [] as ResetHandler[];
    }

    return Array.isArray(onReset) ? onReset : [onReset];
  }, [onReset]);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];
    unsubscribes.push(sdkInstance.onReset(handleReset));

    normalizedResetHandlers.forEach((handler) => {
      unsubscribes.push(sdkInstance.onReset(handler));
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {
          // Ignore unsubscribe errors to avoid interrupting unmount flow
        }
      });
    };
  }, [sdkInstance, handleReset, normalizedResetHandlers]);

  const addResetListener = useCallback((handler: ResetHandler) => sdkInstance.onReset(handler), [sdkInstance]);

  return useMemo(
    () => ({ sdk: sdkInstance, connectionState, retry, lastResetPayload, addResetListener }),
    [sdkInstance, connectionState, retry, lastResetPayload, addResetListener]
  );
};
