import { useEffect } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { useTabletStore } from '../store';
import { emitMirror } from '../socket';

export function MessageDisplay() {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);
  const selectedMessage = useTabletStore((state) => state.selectedMessage);

  useEffect(() => {
    if (currentView !== 'message-display') return;

    emitMirror('message_preview', 3, { messageText: selectedMessage });

    const timer = setTimeout(() => {
      setView('feedback-input');
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentView, setView]);

  return (
    <View viewId="message-display">
      <div
        className="w-full h-full bg-cover bg-center flex flex-col items-center justify-center gap-16"
        style={{ backgroundImage: 'url(/images/fb_bg2.png)' }}
      >
        {/* Message with border */}
        <div className="relative flex items-center justify-center" style={{ width: '550px', height: '450px' }}>
          <img 
            src="/images/border.png" 
            alt="border" 
            className="absolute inset-0 w-full h-full object-contain"
          />
          <p className="relative z-10 text-3xl font-semibold text-white text-center px-16 italic leading-tight">
            {selectedMessage}
          </p>
        </div>

        {/* Thank you message */}
        <div className="text-center">
          <p className="text-5xl font-semibold text-white italic leading-tight">
            Gracias por<br />
            compartir sus<br />
            aprendizajes.
          </p>
        </div>
      </div>
    </View>
  );
}
