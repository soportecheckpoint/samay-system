import { useEffect } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';

export function FinalMessage() {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);

  useEffect(() => {
    if (currentView !== 'final-message') return;

    const timer = setTimeout(() => {
      setView('help-view');
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentView, setView]);

  return (
    <View viewId="final-message">
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/fb_bg6.png)' }}
      />
    </View>
  );
}
