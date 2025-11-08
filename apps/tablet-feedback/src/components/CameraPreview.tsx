import { useEffect, useRef } from "react";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);
  const resetTablet = useTabletStore((state) => state.reset);

  // Start camera when view becomes active
  useEffect(() => {
    const startCamera = async () => {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        console.log("[CAMERA-PREVIEW] Camera started successfully");
      } catch (error) {
        console.error("[CAMERA-PREVIEW] Error accessing camera:", error);
      }
    };

    if (currentView === "camera-preview") {
      console.log("[CAMERA-PREVIEW] View active, starting camera");
      startCamera();
    }

    return () => {
      // Clean up camera stream when leaving view
      if (streamRef.current) {
        console.log("[CAMERA-PREVIEW] Stopping camera stream");
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [currentView]);

  const handleScreenTap = () => {
    setView("message-select");
  };

  useEffect(() => {
    if (currentView === "camera-preview") {
      resetTablet();
    }
  }, [currentView, resetTablet]);

  return (
    <View viewId="camera-preview">
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: "url(/images/fb_bg1.png)" }}
        onClick={handleScreenTap}
      >
        {/* Camera preview in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-[60px] overflow-hidden border-8 border-white shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </View>
  );
}
