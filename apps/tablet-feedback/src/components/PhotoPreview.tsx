import { useEffect, useState } from "react";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";

export function PhotoPreview() {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);
  const photoData = useTabletStore((state) => state.photoData);
  const photoMessage = useTabletStore((state) => state.photoMessage);
  const composedImage = useTabletStore((state) => state.composedImage);
  const composedImageUrl = useTabletStore((state) => state.composedImageUrl);
  const photoServerPath = useTabletStore((state) => state.photoServerPath);
  const [photoSnapshot, setPhotoSnapshot] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return photoData;
    }

    const stored = sessionStorage.getItem("tablet-feedback:last-photo");
    return photoData ?? stored ?? null;
  });

  useEffect(() => {
    if (!photoSnapshot && typeof window !== "undefined") {
      const stored = sessionStorage.getItem("tablet-feedback:last-photo");
      if (stored) {
        setPhotoSnapshot(stored);
      }
    }
  }, [photoSnapshot]);

  useEffect(() => {
    if (typeof photoData === "string" && photoData.length > 0) {
      setPhotoSnapshot(photoData);
    }
  }, [photoData]);
  useEffect(() => {
    if (!photoSnapshot && typeof photoServerPath === "string" && photoServerPath.length > 0) {
      setPhotoSnapshot(photoServerPath);
    }
  }, [photoServerPath, photoSnapshot]);

  const previewPhoto = photoSnapshot ?? photoData ?? photoServerPath ?? null;

  useEffect(() => {
    if (currentView !== "photo-preview") return;

    const timer = setTimeout(() => {
      setView("final-message");
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentView, photoMessage, previewPhoto, composedImage, composedImageUrl, setView]);

  return (
    <View viewId="photo-preview">
      <div
        className="w-full h-full bg-cover bg-center flex flex-col items-center justify-center gap-10 px-12"
        style={{ backgroundImage: "url(/images/fb_bg7.png)" }}
      >
        <div className="w-full max-w-3xl bg-white rounded-[40px] px-12 py-10 text-center shadow-lg min-h-[180px] flex items-center justify-center">
          <p className="text-2xl font-semibold text-black italic leading-relaxed">
            {photoMessage || "mensaje de reconocimiento"}
          </p>
        </div>

        <div className="w-full max-w-3xl bg-white rounded-[40px] overflow-hidden shadow-lg flex items-center justify-center min-h-[420px]">
          {previewPhoto ? (
            <img
              src={previewPhoto}
              alt="Team photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <p className="text-2xl font-semibold text-black italic">
              foto grupal
            </p>
          )}
        </div>
      </div>
    </View>
  );
}
