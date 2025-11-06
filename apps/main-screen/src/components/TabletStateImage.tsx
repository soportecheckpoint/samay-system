import React, { useMemo } from "react";
import { FeedbackInputView, PhotoMessageView } from "@samay/tablet-shared-ui";
import {
  useTabletMirrorStore,
  useTabletSyncStore,
  useWinOverlayStore,
  useTotemStore,
} from "../store";

const VIEW_IMAGE_MAP: Record<string, string> = {
  "message-select": "/images/ipad_selecting.png",
  "message-display": "/images/ipad_selecting.png",
  "feedback-input": "/images/ipad_feedback.png",
  "feedback-confirm": "/images/ipad_feedback_completed.png",
  "photo-capture": "/images/ipad_taking_photo.png",
  "photo-message": "/images/ipad_message.png",
  "final-message": "/images/ipad_message_completed.png",
  "help-view": "/images/ipad_help.png",
  "final-view": "/images/ipad_final.png",
};

const SCREEN_TO_VIEW: Record<string, string> = {
  qr_scan: "camera-preview",
  message_selected: "message-select",
  message_preview: "message-display",
  feedback_form: "feedback-input",
  processing_transition: "final-message",
  photo_prep: "photo-capture",
  taking_photo: "photo-capture",
  frame_message: "photo-message",
  help_prompt: "help-view",
  final_code_ready: "final-view",
};

const DEFAULT_IMAGE_SRC = "/images/ipad_selecting.png";

export const TabletStateImage: React.FC = () => {
  const { screen, content } = useTabletMirrorStore();
  const {
    currentView,
    frameMessage,
    photoData,
    feedbackText,
    composedImage,
    composedImageUrl,
  } =
    useTabletSyncStore();
  const { imageSrc: winImageSrc, variant: winVariant } = useWinOverlayStore();
  const { currentView: totemView } = useTotemStore();

  const mirrorMessage = useMemo(() => {
    const raw = content
      ? (content as Record<string, unknown>)["frameMessage"]
      : undefined;
    const candidate = typeof raw === "string" ? raw : undefined;
    return typeof candidate === "string" ? candidate : "";
  }, [content]);

  const mirrorFeedback = useMemo(() => {
    const raw = content
      ? (content as Record<string, unknown>)["feedbackText"]
      : undefined;
    const candidate = typeof raw === "string" ? raw : undefined;
    return typeof candidate === "string" ? candidate : "";
  }, [content]);

  const mirrorPhoto = useMemo(() => {
    const raw = content
      ? (content as Record<string, unknown>)["photoData"]
      : undefined;
    const candidate = typeof raw === "string" ? raw : undefined;
    return typeof candidate === "string" ? candidate : null;
  }, [content]);

  const mirrorComposed = useMemo(() => {
    const raw = content
      ? (content as Record<string, unknown>)["composedImage"]
      : undefined;
    const candidate = typeof raw === "string" ? raw : undefined;
    return typeof candidate === "string" ? candidate : null;
  }, [content]);

  const mirrorComposedUrl = useMemo(() => {
    const raw = content
      ? (content as Record<string, unknown>)["composedImageUrl"]
      : undefined;
    const candidate = typeof raw === "string" ? raw : undefined;
    return typeof candidate === "string" ? candidate : null;
  }, [content]);

  const resolvedView = useMemo(() => {
    if (currentView) {
      return currentView;
    }

    if (screen) {
      return SCREEN_TO_VIEW[screen] ?? "";
    }

    return "";
  }, [currentView, screen]);

  if (totemView === "before-start") {
    return (
      <img
        src="/images/totten-before-start.png"
        alt="Totem antes de iniciar"
        className="w-full max-w-xl object-contain drop-shadow-[0_20px_60px_rgba(15,23,42,0.45)]"
      />
    );
  }

  if (winImageSrc && winVariant === "final") {
    return null;
  }

  if (winImageSrc && winVariant === "message") {
    return (
      <img
        src={winImageSrc}
        alt="Mensaje de victoria"
        className="w-full max-w-xl object-contain drop-shadow-[0_20px_60px_rgba(15,23,42,0.45)]"
      />
    );
  }

  if (!resolvedView || resolvedView === "camera-preview") {
    return null;
  }

  if (resolvedView === "feedback-input") {
    const displayText = feedbackText || mirrorFeedback;

    return (
      <div className="w-full max-w-2xl" style={{ aspectRatio: "3 / 4" }}>
        <div className="h-full w-full">
          <FeedbackInputView value={displayText} readOnly />
        </div>
      </div>
    );
  }

  if (resolvedView === "photo-preview") {
    const displayMessage = frameMessage || mirrorMessage;
    const displayPhoto = photoData || mirrorPhoto;
    const displayComposite =
      composedImage || composedImageUrl || mirrorComposed || mirrorComposedUrl;

    return (
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        {displayComposite ? (
          <div className="w-full overflow-hidden rounded-[40px] shadow-lg">
            <img
              src={displayComposite}
              alt="Reconocimiento final"
              className="w-full object-contain"
            />
          </div>
        ) : (
          <>
            <div className="w-full rounded-[40px] bg-white px-10 py-8 text-center">
              <p className="text-2xl font-medium italic text-[#1b1b1b]">
                {displayMessage || "Mensaje en preparación"}
              </p>
            </div>
            {displayPhoto && (
              <div className="overflow-hidden rounded-[40px] bg-white">
                <img
                  src={displayPhoto}
                  alt="Foto del equipo"
                  className="w-full object-contain"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (resolvedView === "photo-message") {
    const displayMessage = frameMessage || mirrorMessage;

    return (
      <div className="w-full max-w-2xl" style={{ aspectRatio: "3 / 4" }}>
        <div className="h-full w-full">
          <PhotoMessageView value={displayMessage} readOnly />
        </div>
      </div>
    );
  }

  const imageSrc = VIEW_IMAGE_MAP[resolvedView] ?? DEFAULT_IMAGE_SRC;

  return (
    <img
      src={imageSrc}
      alt="Estado actual de la tablet"
      className="w-full max-w-xl object-contain"
    />
  );
};
