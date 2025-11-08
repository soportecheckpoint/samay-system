import { useEffect, useRef } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';

export function AudioView() {
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    if (currentView === 'audio') {
      videoElement.currentTime = 0;

      const playbackPromise = videoElement.play();

      if (playbackPromise !== undefined) {
        playbackPromise.catch(() => {
          // Silently ignore autoplay restrictions; the user can trigger playback manually.
        });
      }
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
        playsInline
        controls={false}
        onEnded={() => setView('code')}
      />
    </View>
  );
}
