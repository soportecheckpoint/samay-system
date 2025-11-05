import React from 'react';
import { useVictoryStore, useWinOverlayStore } from '../store';

const VictoryScreen: React.FC = () => {
  const isVictory = useVictoryStore((state) => state.isVictory);
  const { imageSrc, variant } = useWinOverlayStore();

  if (imageSrc && variant === 'final') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <img
          src={imageSrc}
          alt="Mensaje de victoria"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (imageSrc && variant === 'message') {
    return null;
  }

  if (!isVictory) {
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
