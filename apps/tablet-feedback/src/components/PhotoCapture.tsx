import { useCallback, useEffect, useRef, useState } from "react";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";

export function PhotoCapture() {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);
  const setPhotoData = useTabletStore((state) => state.setPhotoData);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [captured, setCaptured] = useState(false);

  const stopStream = useCallback(() => {
    const activeStream = streamRef.current;
    if (!activeStream) {
      return;
    }

    activeStream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setHasStream(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      console.log("[PHOTO-CAPTURE] Camera stream already exists, reusing");
      setHasStream(true);
      return;
    }

    try {
      console.log("[PHOTO-CAPTURE] Requesting camera access");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setHasStream(true);
      setCaptured(false);
      console.log("[PHOTO-CAPTURE] Camera started successfully");
    } catch (err) {
      console.error("[PHOTO-CAPTURE] Camera error:", err);
    }
  }, []);

  // Start camera only when this view becomes active
  useEffect(() => {
    if (currentView === "photo-capture") {
      console.log("[PHOTO-CAPTURE] View active, starting camera");
      setCaptured(false); // Reset captured state when entering view
      void startCamera();
    } else {
      stopStream();
    }

    return () => {
      console.log("[PHOTO-CAPTURE] Cleaning up camera");
      stopStream();
    };
  }, [currentView, startCamera, stopStream]);

  useEffect(() => {
    if (!captured && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [captured, hasStream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (!context) return;

      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      // Calculate the size and position for a square crop (center)
      const squareSize = Math.min(videoWidth, videoHeight);
      const sx = (videoWidth - squareSize) / 2;
      const sy = (videoHeight - squareSize) / 2;

      // Set canvas to square dimensions
      canvasRef.current.width = squareSize;
      canvasRef.current.height = squareSize;

      // Draw the cropped square portion of the video to canvas
      context.drawImage(
        videoRef.current,
        sx,
        sy,
        squareSize,
        squareSize,
        0,
        0,
        squareSize,
        squareSize,
      );

      // Get the image data
      const photo = canvasRef.current.toDataURL("image/jpeg", 0.9);
      console.log("Photo captured:", photo.substring(0, 50)); // Debug

      setPhotoData(photo);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("tablet-feedback:last-photo", photo);
        } catch (error) {
          console.warn("Unable to persist photo snapshot", error);
        }
      }
      setCaptured(true);
      stopStream();
    } else {
      console.error("Video or canvas ref not available");
    }
  };

  const retake = () => {
    setCaptured(false);
    stopStream();
    void startCamera();
  };

  const confirm = () => {
    setView("photo-message");
  };

  return (
    <View viewId="photo-capture">
      <div
        className="w-full h-full bg-cover bg-center flex flex-col items-center justify-center"
        style={{ backgroundImage: "url(/images/fb_bg5.png)" }}
      >
        <div className="text-center mb-8">
          <p className="text-white text-4xl font-semibold italic">
            Activa Cámara
          </p>
        </div>

        <div className="w-[500px]">
          <div className="relative w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full rounded-[50px] border-8 border-white bg-black ${captured ? "hidden" : "block"}`}
              style={{ aspectRatio: "1/1", objectFit: "cover" }}
            />
            <canvas
              ref={canvasRef}
              className={`w-full rounded-[50px] border-8 border-white bg-black ${captured ? "block" : "hidden"}`}
            />
          </div>

          {!captured && hasStream && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={capturePhoto}
                className="w-24 h-24 rounded-full bg-white border-8 border-[#E91E63] hover:bg-gray-100 transition shadow-xl flex items-center justify-center"
              >
                <span className="text-[#E91E63] font-semibold text-lg italic">
                  Foto
                </span>
              </button>
            </div>
          )}

          {captured && (
            <div className="mt-8 flex gap-4 justify-center">
              <button
                onClick={retake}
                className="px-10 py-4 rounded-full bg-white/90 text-black font-medium hover:bg-white transition shadow-lg italic text-lg"
              >
                Otra foto
              </button>
              <button
                onClick={confirm}
                className="px-10 py-4 rounded-full bg-[#00BCD4] text-white font-medium hover:bg-[#00ACC1] transition shadow-lg italic text-lg"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>
      </div>
    </View>
  );
}
