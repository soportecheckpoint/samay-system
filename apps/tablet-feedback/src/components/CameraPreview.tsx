import { useEffect, useRef } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { emitMirror, emitTabletReset } from '../socket';
import { useTabletStore } from '../store';

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);
  const resetTablet = useTabletStore((state) => state.reset);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const handleScreenTap = () => {
    setView('message-select');
  };

  useEffect(() => {
    if (currentView === 'camera-preview') {
      resetTablet();
      emitTabletReset();
      emitMirror('qr_scan', 1, {});
    }
  }, [currentView, resetTablet]);

  return (
    <View viewId="camera-preview">
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/fb_bg1.png)' }}
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
