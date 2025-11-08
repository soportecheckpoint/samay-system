import { useEffect, useRef } from 'react';
import { useAudioStore } from '../store';

/**
 * Hook to play audio when a specific dependency changes
 * Only plays audio after user has interacted (audio context initialized)
 * Stops any currently playing audio before starting a new one
 */
export const useAudioPlayer = (audioSrc?: string, dependencies?: unknown[]) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isInitialized } = useAudioStore();

  useEffect(() => {
    // Don't play audio until user has interacted
    if (!isInitialized) {
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Play new audio if provided
    if (audioSrc) {
      audioRef.current = new Audio(`/public${audioSrc}`);
      audioRef.current.play().catch((err) => {
        console.error('Error playing audio:', err);
      });
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioSrc, isInitialized, ...(dependencies || [])]);
};
