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
// This hook now depends on remainingMs explicitly to ensure it restarts the optimistic
// countdown whenever the server sends an updated remaining value (for example on resume).
const useOptimisticTimer = (phase: TimerPhase, lastServerSyncAt: number, remainingMs: number) => {
  useEffect(() => {
    let timeoutId: number | null = null;
    let active = true;

    const clearCurrent = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Always clear previous timeouts on any dependency change or cleanup
    clearCurrent();

    if (phase !== 'running' || !active) {
      return () => {
        active = false;
        clearCurrent();
      };
    }

    if (remainingMs <= 0) {
      useTimerStore.getState().update({ remainingMs: 0 });
      return () => {
        active = false;
        clearCurrent();
      };
    }

    const targetTimestamp = Date.now() + remainingMs;

    const scheduleTick = () => {
      if (!active) {
        return;
      }

      const state = useTimerStore.getState();
      if (state.phase !== 'running') {
        return;
      }

      const msLeft = Math.max(0, targetTimestamp - Date.now());
      state.update({ remainingMs: msLeft });

      if (msLeft <= 0) {
        return;
      }

      const delay = msLeft % 1000 || 1000;
      timeoutId = window.setTimeout(scheduleTick, delay);
    };

    const initialDelay = remainingMs % 1000 || 1000;
    timeoutId = window.setTimeout(scheduleTick, initialDelay);

    return () => {
      active = false;
      clearCurrent();
    };
  }, [phase, lastServerSyncAt, remainingMs]);
};

export const Timer: React.FC = () => {
  const remainingMs = useTimerStore((state) => state.remainingMs);
  const phase = useTimerStore((state) => state.phase);
  const lastServerSyncAt = useTimerStore((state) => state.lastServerSyncAt);

  useOptimisticTimer(phase, lastServerSyncAt, remainingMs);

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
