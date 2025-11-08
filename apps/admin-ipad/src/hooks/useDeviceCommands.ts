import { useCallback, useMemo } from "react";
import { useScapeSdk } from "@samay/scape-sdk";
import { DEVICE, type DeviceId } from "@samay/scape-protocol";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

interface CommandOptions {
  payload?: unknown;
  targetInstanceId?: string;
}

interface ResetOptions {
  reason?: string;
  metadata?: Record<string, unknown>;
  targetInstanceId?: string;
}

interface BuildOptions {
  instanceId?: string;
}

interface DeviceCommandHandle {
  execute: (command: string, options?: CommandOptions) => void;
  reset: (options?: ResetOptions) => void;
  isReady: boolean;
}

export function useDeviceCommands() {
  const { sdk, connectionState } = useScapeSdk({
    createOptions: {
      device: DEVICE.ADMIN,
      url: SERVER_URL,
    },
    connectOnMount: true,
  });

  const isConnected = connectionState.status === "connected";

  const sendCommand = useCallback(
    (target: DeviceId | undefined, command: string, options?: CommandOptions) => {
      if (!target || !command || !isConnected) {
        return;
      }

      sdk.direct.send(target, command, options?.payload, {
        targetInstanceId: options?.targetInstanceId,
      });
    },
    [sdk, isConnected],
  );

  const resetDevice = useCallback(
    (target: DeviceId | undefined, options?: ResetOptions) => {
      if (!target || !isConnected) {
        return;
      }

      const metadata = { ...(options?.metadata ?? {}) } as Record<string, unknown> & {
        targets?: Array<{ device?: DeviceId; deviceId?: DeviceId; instanceId?: string }>;
      };

      const existingTargets = Array.isArray(metadata.targets) ? metadata.targets : [];
      const normalizedTargets = existingTargets.filter((entry) => entry && (entry.device || entry.deviceId));
      normalizedTargets.push({ device: target, deviceId: target, instanceId: options?.targetInstanceId });
      metadata.targets = normalizedTargets;

      sdk.reset(
        {
          reason: options?.reason ?? "manual-device-reset",
          metadata,
        },
        { broadcast: true },
      );
    },
    [sdk, isConnected],
  );

  const getCommands = useCallback(
    (target?: DeviceId, options?: BuildOptions): DeviceCommandHandle => {
      const targetInstanceId = options?.instanceId;

      const execute = (command: string, commandOptions?: CommandOptions) => {
        sendCommand(target, command, {
          payload: commandOptions?.payload,
          targetInstanceId: commandOptions?.targetInstanceId ?? targetInstanceId,
        });
      };

      const reset = (resetOptions?: ResetOptions) => {
        resetDevice(target, {
          reason: resetOptions?.reason,
          metadata: resetOptions?.metadata,
          targetInstanceId: resetOptions?.targetInstanceId ?? targetInstanceId,
        });
      };

      return {
        execute,
        reset,
        isReady: Boolean(target) && isConnected,
      };
    },
    [sendCommand, resetDevice, isConnected],
  );

  return useMemo(
    () => ({
      getCommands,
      sendCommand,
      resetDevice,
      connectionState,
      isConnected,
    }),
    [getCommands, sendCommand, resetDevice, connectionState, isConnected],
  );
}
