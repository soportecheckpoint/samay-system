import { useEffect } from "react";
import { useScapeSdk, type ScapeSdk } from "@samay/scape-sdk";
import { DEVICE } from "@samay/scape-protocol";
import useViewStore from "./view-manager/view-manager-store";
import { useAiStore } from "./store";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let sharedSdk: ScapeSdk<typeof DEVICE.AI_APP> | null = null;

const ensureClient = () => {
  if (!sharedSdk) {
    console.warn("[AI-APP][SDK] Attempted to use SDK before initialization");
    return null;
  }
  return sharedSdk;
};

const resetLocalState = () => {
  useAiStore.getState().reset();
  useViewStore.getState().resetFlow("home");
};

export function useSocket() {
  const sdkResult = useScapeSdk<typeof DEVICE.AI_APP>({
    cacheKey: `sdk-${DEVICE.AI_APP}`,
    createOptions: {
      url: SERVER_URL,
      device: DEVICE.AI_APP,
      metadata: { role: "ai-app" }
    }
  });
  const { sdk, lastResetPayload } = sdkResult;

  useEffect(() => {
    sharedSdk = sdk;

    return () => {
      if (sharedSdk === sdk) {
        sharedSdk = null;
      }
    };
  }, [sdk]);

  useEffect(() => {
    const unsubscribe = sdk.direct.on("start", () => {
      resetLocalState();
    });

    return () => {
      unsubscribe();
    };
  }, [sdk]);

  useEffect(() => {
    if (!lastResetPayload) {
      return;
    }

    resetLocalState();
  }, [lastResetPayload]);

  return sdkResult;
}

export function printPDF() {
  const client = ensureClient();
  if (!client) {
    return;
  }

  client.printer.print();
}