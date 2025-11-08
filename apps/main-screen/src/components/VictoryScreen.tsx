import React from 'react';
import { useTimerStore } from '../store';

const VictoryScreen: React.FC = () => {
  const { phase } = useTimerStore();

  // Show victory screen when phase is "won"
  if (phase !== 'won') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <img
        src="/images/final_win.png"
        alt="Mensaje de victoria"
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export default VictoryScreen;
