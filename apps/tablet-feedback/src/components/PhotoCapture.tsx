import { useCallback, useEffect, useRef, useState } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { useTabletStore } from '../store';
import { emitMirror } from '../socket';

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
      setHasStream(true);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setHasStream(true);
      setCaptured(false);
      emitMirror('taking_photo', 6, { status: 'camera_active' });
    } catch (err) {
      console.error('Camera error:', err);
      emitMirror('taking_photo', 6, { status: 'camera_error' });
    }
  }, []);

  // Start camera only when this view becomes active
  useEffect(() => {
    if (currentView === 'photo-capture') {
      void startCamera();
    } else {
      stopStream();
    }

    return () => {
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
      const context = canvasRef.current.getContext('2d');
      if (!context) return;
      
      // Set canvas size to match video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      
      // Draw the video frame to canvas
  context.drawImage(videoRef.current, 0, 0);
      
      // Get the image data
      const photo = canvasRef.current.toDataURL('image/jpeg', 0.9);
      console.log('Photo captured:', photo.substring(0, 50)); // Debug
      
      setPhotoData(photo);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('tablet-feedback:last-photo', photo);
        } catch (error) {
          console.warn('Unable to persist photo snapshot', error);
        }
      }
      setCaptured(true);
      stopStream();
      emitMirror('taking_photo', 6, { status: 'photo_captured', photoData: photo });
    } else {
      console.error('Video or canvas ref not available');
    }
  };

  const retake = () => {
    setCaptured(false);
    stopStream();
    emitMirror('taking_photo', 6, { status: 'camera_active' });
    void startCamera();
  };

  const confirm = () => {
    setView('photo-message');
  };

  return (
    <View viewId="photo-capture">
      <div
        className="w-full h-full bg-cover bg-center flex flex-col items-center justify-center"
        style={{ backgroundImage: 'url(/images/fb_bg4.png)' }}
      >
        <div className="text-center mb-8">
          <p className="text-white text-4xl font-semibold italic">Activa Cámara</p>
        </div>
        
        <div className="w-[500px]">
          <div className="relative w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full rounded-[50px] border-8 border-white bg-black ${captured ? 'hidden' : 'block'}`}
              style={{ aspectRatio: '1/1', objectFit: 'cover' }}
            />
            <canvas
              ref={canvasRef}
              className={`w-full rounded-[50px] border-8 border-white bg-black ${captured ? 'block' : 'hidden'}`}
            />
          </div>

          {!captured && hasStream && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={capturePhoto}
                className="w-24 h-24 rounded-full bg-white border-8 border-[#E91E63] hover:bg-gray-100 transition shadow-xl flex items-center justify-center"
              >
                <span className="text-[#E91E63] font-semibold text-lg italic">Foto</span>
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
