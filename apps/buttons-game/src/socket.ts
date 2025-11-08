import { useEffect } from "react";
import { useScapeSdk, type ScapeSdk } from "@samay/scape-sdk";
import { DEVICE, type ButtonState } from "@samay/scape-protocol";
import { useGameStore } from "./store";
import useViewStore from "./view-manager/view-manager-store";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let sharedSdk: ScapeSdk<typeof DEVICE.BUTTONS_APP> | null = null;

const ensureClient = () => {
  if (!sharedSdk) {
    console.warn("[BUTTONS][SDK] Attempted to use SDK before initialization");
    return null;
  }
  return sharedSdk;
};

const resetModuleState = () => {
  useGameStore.getState().resetGame();
  const viewStore = useViewStore.getState();
  viewStore.resetFlow("code");
  viewStore.resetCode();
};

const skipCodeStep = () => {
  const viewStore = useViewStore.getState();
  viewStore.resetFlow("mesa");
  viewStore.resetCode();

  const gameStore = useGameStore.getState();
  gameStore.setError("");
};

const forceCompleteGame = () => {
  const gameStore = useGameStore.getState();
  const completedButtons = gameStore.buttons.map((button) => ({
    ...button,
    pressed: true,
    completed: true,
  }));
  gameStore.updateButtons(completedButtons);
  gameStore.setError("");

  const viewStore = useViewStore.getState();
  viewStore.resetFlow("message");
};

const mapButtonStates = (buttons: ButtonState[]) => {
  return buttons.map((button, index) => {
    const parsedId = Number.parseInt(String(button.id), 10);

    return {
      id: Number.isFinite(parsedId) ? parsedId : index + 1,
      pressed: Boolean(button.pressed),
      completed: Boolean(button.completed)
    };
  });
};

export const useSocket = () => {
  const sdkResult = useScapeSdk<typeof DEVICE.BUTTONS_APP>({
    cacheKey: `sdk-${DEVICE.BUTTONS_APP}`,
    createOptions: {
      url: SERVER_URL,
      device: DEVICE.BUTTONS_APP,
      metadata: { role: "buttons-app" }
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
    const unsubscribe = sdk.direct.on("setState", (payload: { buttons: ButtonState[]; completed?: boolean }) => {
      if (!payload || !Array.isArray(payload.buttons)) {
        return;
      }

      const store = useGameStore.getState();
      store.updateButtons(mapButtonStates(payload.buttons));
      store.setError("");

      const viewStore = useViewStore.getState();
      if (viewStore.currentView === "code") {
        viewStore.setView("mesa");
      }

      const completedFlag = payload.completed ?? payload.buttons.every((button: ButtonState) => button.completed);
      if (completedFlag) {
        if (viewStore.currentView !== "message") {
          viewStore.setView("message");
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sdk]);

  useEffect(() => {
    const unsubscribe = sdk.direct.on("command", (payload) => {
      if (payload.action === "skip-code") {
        skipCodeStep();
      } else if (payload.action === "force-complete") {
        forceCompleteGame();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sdk]);

  useEffect(() => {
    if (!lastResetPayload) {
      return;
    }

    resetModuleState();
  }, [lastResetPayload]);

  return sdkResult;
};

export const requestButtonsStart = () => {
  const client = ensureClient();
  if (!client) {
    return;
  }

  client.direct.execute(DEVICE.BUTTONS_ARDUINO).start({ metadata: {} });
};
