import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useTabletStore } from "./store";
import useViewStore from "./view-manager/view-manager-store";
import type { Step } from "./store";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let socket: Socket | null = null;

type TabletSnapshot = {
  currentStep?: Step;
  sessionId?: string;
  selectedMessage?: string;
  feedbackText?: string;
  photoData?: string | null;
  photoMessage?: string;
  composedImage?: string | null;
  composedImagePath?: string | null;
  composedImageUrl?: string | null;
};

type TabletSyncStep =
  | Step
  | "qr-scan"
  | "message-select"
  | "feedback"
  | "photo"
  | "frame-message"
  | "final-code";

const applyTabletSnapshot = (snapshot?: TabletSnapshot) => {
  if (!snapshot) {
    return;
  }

  useTabletStore.getState().hydrate({
    currentStep: snapshot.currentStep,
    sessionId: snapshot.sessionId,
    selectedMessage: snapshot.selectedMessage,
    feedbackText: snapshot.feedbackText,
    photoData: snapshot.photoData,
    photoMessage: snapshot.photoMessage,
    composedImage: snapshot.composedImage,
    composedImagePath: snapshot.composedImagePath,
    composedImageUrl: snapshot.composedImageUrl,
  });
};

export const useSocket = () => {
  useEffect(() => {
    if (!socket) {
      socket = io(SERVER_URL);

      socket.on("connect", () => {
        console.log("[TABLET] Conectado al servidor");
        useTabletStore.getState().reset();
        useViewStore.getState().resetFlow("camera-preview");
        socket?.emit("register", {
          appType: "tablet-feedback",
          sessionId: "TABLET_SESSION",
        });
        emitTabletReset();
      });

      socket.on("state:update", (payload: { tablet?: TabletSnapshot }) => {
        applyTabletSnapshot(payload?.tablet);
      });

      socket.on("tablet:state", (snapshot: TabletSnapshot) => {
        applyTabletSnapshot(snapshot);
      });

      socket.on("tablet:reset", () => {
        console.log("[TABLET] Reset recibido");
        useTabletStore.getState().reset();
        useViewStore.getState().resetFlow("camera-preview");
      });

      socket.on("game:reset", () => {
        console.log("[TABLET] Game reset recibido");
        useTabletStore.getState().reset();
        useViewStore.getState().resetFlow("camera-preview");
      });

      socket.on("tablet-feedback:reset", () => {
        console.log("[TABLET] Reset general recibido");
        useTabletStore.getState().reset();
        useViewStore.getState().resetFlow("camera-preview");
      });

      socket.on("disconnect", (reason) => {
        console.log("[TABLET] Desconectado del servidor", reason);
      });

      socket.on("connect_error", (error) => {
        console.error("[TABLET] Error al conectar con el servidor", error);
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  return socket;
};

export const emitMirror = (screen: string, step: number, content: any) => {
  if (socket) {
    socket.emit("tablet:mirror", { screen, step, content });
  }
};

export const emitMessageSelected = (message: string) => {
  if (socket) {
    socket.emit("tablet:message-selected", { messageText: message });
  }
};

export const emitFrameMessage = (
  message: string,
  photoData?: string | null,
  composedImage?: string | null,
) => {
  if (socket) {
    socket.emit("tablet:frame-message", { message, photoData, composedImage });
  }
};

export const emitTabletStep = (step: TabletSyncStep) => {
  if (socket) {
    socket.emit("tablet:step-change", { step });
  }
};

export const emitTabletView = (viewId: string) => {
  if (socket) {
    socket.emit("tablet:view-change", { viewId });
  }
};

export const emitTabletReset = () => {
  if (socket) {
    socket.emit("tablet:reset");
  }
};
