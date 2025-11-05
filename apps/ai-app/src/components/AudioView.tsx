import { useEffect } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';

export function AudioView() {
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);

  useEffect(() => {
    // Solo crear el timer si esta vista está activa
    if (currentView !== 'audio') return;

    const timer = setTimeout(() => {
      setView('code');
    }, 5000);

    return () => clearTimeout(timer);
  }, [setView, currentView]);

  return (
    <View viewId="audio">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/ai_audio.png)' }}
      />
    </View>
  );
}
