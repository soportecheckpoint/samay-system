import React, { useMemo } from 'react';
import { useTimerStore } from '../store';

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

export const Timer: React.FC = () => {
  const { remainingMs } = useTimerStore();

  const timeLabel = useMemo(() => formatTime(remainingMs), [remainingMs]);
  const digits = useMemo(() => splitDigits(timeLabel), [timeLabel]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-center gap-3">
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
      </div>
    </section>
  );
};
