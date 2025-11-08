import { useEffect } from "react";
import { useScapeSdk } from "@samay/scape-sdk";
import { DEVICE, type DirectCommandPayload, type StorageUpdatePayload } from "@samay/scape-protocol";
import {
	usePreviousMessageStore,
	useTimerStore,
	useViewStore,
	type TimerState,
	type TimerPhase,
} from "./store";
import { isViewType } from "./viewMapping";

type Cleanup = () => void;

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

type TimerSlice = Omit<TimerState, "update">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isTimerPhase = (value: unknown): value is TimerPhase =>
	value === "idle" || value === "running" || value === "paused" || value === "won";

const handleStorageUpdate = (payload: StorageUpdatePayload) => {
	const { state } = payload;
	const timerSnapshot = isRecord(state.timer) ? state.timer : null;
	const statusSnapshot = isRecord(state.status) ? state.status : null;
	const lastMessage = state.lastMessage;

	console.log("[MAIN-SCREEN][SDK] Storage update received", payload);

	const timerUpdate: Partial<TimerSlice> = {};

	if (timerSnapshot) {
		if (typeof timerSnapshot.totalMs === "number") {
			timerUpdate.totalMs = timerSnapshot.totalMs;
		}

		if (typeof timerSnapshot.remainingMs === "number") {
			timerUpdate.remainingMs = timerSnapshot.remainingMs;
		}

		if (isTimerPhase(timerSnapshot.phase)) {
			timerUpdate.phase = timerSnapshot.phase;
		}
	}

	if (!timerUpdate.phase && statusSnapshot && isTimerPhase(statusSnapshot.phase)) {
		timerUpdate.phase = statusSnapshot.phase;
	}

	if (Object.keys(timerUpdate).length > 0) {
		useTimerStore.getState().update(timerUpdate);
	}

	if (lastMessage) {
		usePreviousMessageStore.getState().update(lastMessage as string);
	}
};

const handleTabletActivity = (payload: DirectCommandPayload<typeof DEVICE.MAIN_SCREEN, "tabletActivity">) => {
	if (!payload) {
		return;
	}

	const { currentView, input, photoPath, recognitionPath } = payload;

	if (typeof currentView !== "string" || !isViewType(currentView)) {
		return;
	}

	useViewStore.getState().setView(currentView, {
		input: typeof input === "string" ? input : "",
		photoPath:
			typeof photoPath === "string" && photoPath.length > 0 ? photoPath : null,
		recognitionPath:
			typeof recognitionPath === "string" && recognitionPath.length > 0 ? recognitionPath : null,
	});
};

const handleShowImage = (payload: DirectCommandPayload<typeof DEVICE.MAIN_SCREEN, "showImage">) => {
	if (!payload?.image) {
		return;
	}

	const view = payload.image;
	if (!view) {
		return;
	}

	useViewStore.getState().setView(view, {
		input: "",
		photoPath: null,
		recognitionPath: null,
	});
};

export const useMainScreenSdk = () => {
	const sdkResult = useScapeSdk<typeof DEVICE.MAIN_SCREEN>({
		cacheKey: `sdk-${DEVICE.MAIN_SCREEN}`,
		createOptions: {
			url: SERVER_URL,
			device: DEVICE.MAIN_SCREEN,
			metadata: { role: "main-screen" },
		},
	});
	const { sdk, lastResetPayload } = sdkResult;

	useEffect(() => {
		const cleanupFns: Cleanup[] = [];

		cleanupFns.push(sdk.storage.subscribe(handleStorageUpdate, { keys: ["timer", "status", "lastMessage"] }));
		cleanupFns.push(sdk.direct.on("tabletActivity", handleTabletActivity));
		cleanupFns.push(sdk.direct.on("showImage", handleShowImage));

		return () => {
			cleanupFns.forEach((fn) => {
				try {
					fn();
				} catch (error) {
					console.warn("Error cleaning up SDK handler", error);
				}
			});
		};
	}, [sdk]);

	useEffect(() => {
		if (!lastResetPayload) {
			return;
		}

		// Reset all local stores so the UI returns to its initial state after a global reset
		useTimerStore.getState().update({ totalMs: 0, remainingMs: 0, phase: "idle" });
		usePreviousMessageStore.getState().update("");
		useViewStore.getState().setView("");
	}, [lastResetPayload]);

	return sdkResult;
};
