import React, { useEffect, useMemo } from 'react';
import { useTimerStore, type TimerPhase } from '../store';

const formatTime = (milliseconds: number): string => {
  if (typeof milliseconds !== 'number' || Number.isNaN(milliseconds) || milliseconds < 0) {
    return '00:00';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const splitDigits = (timeLabel: string): string[] => Array.from(timeLabel);

// Smoothly decrement the timer locally so UI keeps counting between server syncs.
const useOptimisticTimer = (phase: TimerPhase, lastServerSyncAt: number) => {
  useEffect(() => {
    if (phase !== 'running') {
      return;
    }

    const { remainingMs } = useTimerStore.getState();
    if (remainingMs <= 0) {
      return;
    }

    const targetTimestamp = Date.now() + remainingMs;
    let timeoutId: number | null = null;

    const scheduleTick = () => {
      const state = useTimerStore.getState();
      if (state.phase !== 'running') {
        return;
      }

      const msLeft = Math.max(0, targetTimestamp - Date.now());

      if (msLeft <= 0) {
        state.update({ remainingMs: 0 });
        return;
      }

      state.update({ remainingMs: msLeft });

      const delay = msLeft % 1000 || 1000;
      timeoutId = window.setTimeout(scheduleTick, delay);
    };

    const initialDelay = remainingMs % 1000 || 1000;
    timeoutId = window.setTimeout(scheduleTick, initialDelay);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [phase, lastServerSyncAt]);
};

export const Timer: React.FC = () => {
  const remainingMs = useTimerStore((state) => state.remainingMs);
  const phase = useTimerStore((state) => state.phase);
  const lastServerSyncAt = useTimerStore((state) => state.lastServerSyncAt);

  useOptimisticTimer(phase, lastServerSyncAt);

  const timeLabel = useMemo(() => formatTime(remainingMs), [remainingMs]);
  const digits = useMemo(() => splitDigits(timeLabel), [timeLabel]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-center gap-3">
        <div className="timer-digits">
          {digits.map((character, index) => (
            <span
              key={`${character}-${index}`}
              className={"pr-1 " + (character === ':' ? 'timer-colon' : 'timer-digit')}
            >
              {character}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
