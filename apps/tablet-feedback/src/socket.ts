import { useEffect } from "react";
import { useScapeSdk, type ScapeSdk } from "@samay/scape-sdk";
import { DEVICE, type TabletActivityPayload } from "@samay/scape-protocol";
import useViewStore from "./view-manager/view-manager-store";
import { useTabletStore } from "./store";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let sharedSdk: ScapeSdk<typeof DEVICE.FEEDBACK> | null = null;

const sendTabletActivity = (payload: TabletActivityPayload) => {
  const client = sharedSdk;
  if (!client) {
    console.warn("[TABLET][SDK] Attempted to send tabletActivity without an active SDK instance");
    return;
  }
  try {
    client.direct.execute(DEVICE.MAIN_SCREEN).tabletActivity(payload);
  } catch (error) {
    console.warn("[TABLET][SDK] Failed to send tabletActivity", error);
  }
};

export const useSocket = () => {
  const sdkResult = useScapeSdk<typeof DEVICE.FEEDBACK>({
    cacheKey: `sdk-${DEVICE.FEEDBACK}`,
    createOptions: { url: SERVER_URL, device: DEVICE.FEEDBACK }
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
    let previousView = useViewStore.getState().currentView ?? null;

    const unsubscribe = useViewStore.subscribe((state) => {
      const nextView = state.currentView ?? null;
      if (!nextView || nextView === previousView) {
        return;
      }
      previousView = nextView;
      sendTabletActivity({ currentView: nextView, input: "" });
    });

    return () => {
      unsubscribe?.();
    };
  }, [sdk]);

  useEffect(() => {
    if (!lastResetPayload) {
      return;
    }

    useTabletStore.getState().reset();
    useViewStore.getState().resetFlow("camera-preview");
  }, [lastResetPayload]);

  return sdkResult;
};

export const emitTabletInput = (input: string) => {
  const currentView = useViewStore.getState().currentView ?? "feedback-input";
  sendTabletActivity({ currentView, input });
};

const updateLastMessage = (message: string) => {
  const client = sharedSdk;
  if (!client) {
    console.warn("[TABLET][SDK] Cannot update last message without an active SDK instance");
    return;
  }
  client.storage.modify({
    lastMessage: message
  }, { persistKeys: ["lastMessage"] });
};

export const emitMessageSelected = (message: string) => {
  const sanitized = typeof message === "string" ? message.trim() : "";
  if (!sanitized) {
    return;
  }
  const currentView = useViewStore.getState().currentView ?? "message-select";
  sendTabletActivity({ currentView, input: sanitized });
  updateLastMessage(sanitized);
};

export const emitTabletActivity = (payload: TabletActivityPayload) => {
  const currentView = payload.currentView ?? useViewStore.getState().currentView ?? "";
  if (!currentView) {
    return;
  }
  sendTabletActivity({ ...payload, currentView });
};
