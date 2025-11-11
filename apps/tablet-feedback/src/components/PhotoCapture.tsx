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
                className="relative px-10 text-black font-medium transition italic text-lg"
                style={{ minHeight: "42px", minWidth: "150px" }}
              >
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox="0 0 407 61" 
                  preserveAspectRatio="none"
                >
                  <path 
                    d="M403.601 19.2112C403.218 18.714 399.494 13.9214 394.653 9.81346C390.17 5.83591 384.506 2.43706 382.705 1.59754C380.464 0.489043 378.345 0.0407536 376.397 0H37.6038C34.5313 0 31.8907 0.978086 29.9021 1.85836C24.5313 4.14056 8.47593 14.6142 2.35533 24.3706C-3.24368 33.3038 2.82802 40.7943 3.34147 41.5116C3.34147 41.5116 7.43274 46.8259 12.2983 50.9012C16.7644 54.8788 21.6951 57.8049 24.2216 59.1171C26.0717 60.1115 28.1091 60.7636 30.383 60.8532L369.315 60.8614C371.637 60.8695 374.196 60.2908 377.033 58.8889C381.923 56.5008 398.467 46.1004 404.588 36.3766C410.366 27.2315 404.017 19.7818 403.601 19.2112Z" 
                    fill="rgba(255, 255, 255, 0.9)"
                    className="transition-all"
                  />
                </svg>
                <span className="relative z-10">Otra foto</span>
              </button>
              <button
                onClick={confirm}
                className="relative px-10 text-white font-medium transition italic text-lg"
                style={{ minHeight: "42px", minWidth: "150px" }}
              >
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox="0 0 407 61" 
                  preserveAspectRatio="none"
                >
                  <path 
                    d="M403.601 19.2112C403.218 18.714 399.494 13.9214 394.653 9.81346C390.17 5.83591 384.506 2.43706 382.705 1.59754C380.464 0.489043 378.345 0.0407536 376.397 0H37.6038C34.5313 0 31.8907 0.978086 29.9021 1.85836C24.5313 4.14056 8.47593 14.6142 2.35533 24.3706C-3.24368 33.3038 2.82802 40.7943 3.34147 41.5116C3.34147 41.5116 7.43274 46.8259 12.2983 50.9012C16.7644 54.8788 21.6951 57.8049 24.2216 59.1171C26.0717 60.1115 28.1091 60.7636 30.383 60.8532L369.315 60.8614C371.637 60.8695 374.196 60.2908 377.033 58.8889C381.923 56.5008 398.467 46.1004 404.588 36.3766C410.366 27.2315 404.017 19.7818 403.601 19.2112Z" 
                    fill="#01B5D9"
                    className="transition-all"
                  />
                </svg>
                <span className="relative z-10">Confirmar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </View>
  );
}
