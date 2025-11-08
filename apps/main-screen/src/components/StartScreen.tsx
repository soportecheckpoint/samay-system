import { useAudioStore } from '../store';

export const StartScreen = () => {
  const { isInitialized, initialize } = useAudioStore();

  if (isInitialized) {
    return null;
  }

  const handleStart = () => {
    // Play a small silent audio to initialize audio context
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=';
    audio.play().catch(() => {
      // Ignore if autoplay fails, audio context is still initialized for user interaction
    });
    
    initialize();
  };

  return (
    <button
      onClick={handleStart}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center backdrop-blur-md bg-black/50 transition-all hover:bg-black/60"
    >
      <div className="pointer-events-none text-center">
        <div className="text-4xl font-bold text-white mb-4">
          Toca la pantalla para comenzar
        </div>
        <div className="text-xl text-white/70">
          Se habilitará el audio de la experiencia
        </div>
      </div>
    </button>
  );
};
