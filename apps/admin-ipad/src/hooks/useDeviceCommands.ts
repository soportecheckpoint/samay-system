import { useCallback, useMemo } from "react";
import { useScapeSdk } from "@samay/scape-sdk";
import { DEVICE, type DeviceId } from "@samay/scape-protocol";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

interface CommandOptions {
  payload?: unknown;
  targetInstanceId?: string;
}

interface BuildOptions {
  instanceId?: string;
}

interface DeviceCommandHandle {
  execute: (command: string, options?: CommandOptions) => void;
  reset: (options?: CommandOptions) => void;
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
    (target: DeviceId | undefined, options?: CommandOptions) => {
      if (!target || !isConnected) {
        return;
      }

      sendCommand(target, "reset", {
        payload: options?.payload,
        targetInstanceId: options?.targetInstanceId,
      });
    },
    [sendCommand, isConnected],
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

      const reset = (resetOptions?: CommandOptions) => {
        resetDevice(target, {
          payload: resetOptions?.payload,
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
