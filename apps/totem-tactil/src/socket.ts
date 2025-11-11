import { useEffect } from "react";
import { useScapeSdk, type ScapeSdk } from "@samay/scape-sdk";
import { DEVICE } from "@samay/scape-protocol";
import useViewStore from "./view-manager/view-manager-store";
import { useTotemStore } from "./store";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let sharedSdk: ScapeSdk<typeof DEVICE.TOTEM> | null = null;

const ensureClient = () => {
  if (!sharedSdk) {
    console.warn("[TOTEM][SDK] Attempted to use SDK before initialization");
    return null;
  }
  return sharedSdk;
};

const resetLocalState = () => {
  useTotemStore.getState().reset();
  useViewStore.getState().resetFlow("idle");
};

export function useSocket() {
  const sdkResult = useScapeSdk<typeof DEVICE.TOTEM>({
    cacheKey: `sdk-${DEVICE.TOTEM}`,
    createOptions: {
      url: SERVER_URL,
      device: DEVICE.TOTEM,
      metadata: { role: "totem" }
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
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let startTimer2: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = sdk.direct.on("start", (payload) => {
      resetLocalState();

      const phase = payload?.phase ?? 1;

      const viewStore = useViewStore.getState();
      
      // Si es fase 1, ir a before-start y luego a match
      if (phase === 1) {
        sdk.direct.execute(DEVICE.MAIN_SCREEN).showImage({ image: "notification" });
        
        startTimer = setTimeout(() => {
          viewStore.resetFlow("before-start");
          startTimer2 = setTimeout(() => {
            if (useViewStore.getState().currentView === "before-start") {
              viewStore.setView("match");
            }
          }, 15000);
        }, 30000);
      } else if (phase === 2) {
        // Si es fase 2, ir directamente a contract
        sdk.direct.execute(DEVICE.MAIN_SCREEN).showImage({ image: "accept" });
        startTimer = setTimeout(() => {
          viewStore.resetFlow("contract");
        }, 28000);
      }
    });

    return () => {
      unsubscribe();
      if (startTimer) {
        clearTimeout(startTimer);
        startTimer = null;
      }
      if (startTimer2) {
        clearTimeout(startTimer2);
        startTimer2 = null;
      }
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

export const notifyContractAccepted = () => {
  const client = ensureClient();
  client?.status.win();
};
