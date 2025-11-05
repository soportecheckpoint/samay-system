import React, { useMemo } from 'react';
import { useTimerStore, useConnectionStore } from '../store';

const formatTime = (rawSeconds: number | undefined): string => {
  if (typeof rawSeconds !== 'number' || Number.isNaN(rawSeconds) || rawSeconds < 0) {
    return '00:00';
  }

  const seconds = Math.floor(rawSeconds);
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const splitDigits = (timeLabel: string): string[] => Array.from(timeLabel);

export const Timer: React.FC = () => {
  const { remaining } = useTimerStore();
  const { isConnected } = useConnectionStore();

  const timeLabel = useMemo(() => formatTime(remaining), [remaining]);
  const digits = useMemo(() => splitDigits(timeLabel), [timeLabel]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="timer-digits">
          {digits.map((character, index) => (
            <span
              key={`${character}-${index}`}
              className={character === ':' ? 'timer-colon' : 'timer-digit'}
            >
              {character}
            </span>
          ))}
        </div>
        {!isConnected && (
          <span
            aria-label="Sin conexión"
            title="Sin conexión"
            className="mt-2 h-3 w-3 rounded-full bg-red-500"
          />
        )}
      </div>
    </section>
  );
};
