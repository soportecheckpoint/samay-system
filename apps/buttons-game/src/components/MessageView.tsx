import React, { useEffect } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';

export const MessageView: React.FC = () => {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);

  useEffect(() => {
    // Solo iniciar el timeout si la vista actual es 'message'
    if (currentView !== 'message') {
      return;
    }

    // Después de 8 segundos, pasar a la siguiente vista
    const timer = setTimeout(() => {
      setView('confirm');
    }, 15000);

    return () => clearTimeout(timer);
  }, [currentView, setView]);

  return (
    <View viewId="message">
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: 'url(/bttn_bg_message.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
    </View>
  );
};
