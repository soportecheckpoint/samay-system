import { useEffect, useRef } from "react";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";

export function AudioView() {
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    if (currentView === "audio") {
      videoElement.currentTime = 0;
      videoElement.muted = true; // Asegurar que esté muted para evitar autoplay restrictions

      const attemptPlay = async () => {
        try {
          await videoElement.play();
          console.log("Video reproduciéndose correctamente");
        } catch (error) {
          console.warn("Error al reproducir video:", error);
          // Intentar reproducción con interacción del usuario
          const handleUserInteraction = () => {
            videoElement
              .play()
              .catch((e) => console.error("Error en reproducción manual:", e));
            document.removeEventListener("click", handleUserInteraction);
            document.removeEventListener("touchstart", handleUserInteraction);
          };

          document.addEventListener("click", handleUserInteraction, {
            once: true,
          });
          document.addEventListener("touchstart", handleUserInteraction, {
            once: true,
          });
        }
      };

      attemptPlay();
    } else {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  }, [currentView]);

  return (
    <View viewId="audio">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src="/ondas.mp4"
        poster="/ai_audio.png"
        autoPlay
        muted
        playsInline
        controls={false}
        loop={false}
        preload="auto"
        onEnded={() => setView("code")}
        onError={(e) => console.error("Error cargando video:", e)}
      />
    </View>
  );
}
