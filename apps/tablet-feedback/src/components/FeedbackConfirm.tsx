import { useEffect } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { emitMirror } from '../socket';

export function FeedbackConfirm() {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);

  useEffect(() => {
    if (currentView !== 'feedback-confirm') return;

    emitMirror('processing_transition', 5, { status: 'feedback_submitted' });

    const timer = setTimeout(() => {
      setView('photo-capture');
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentView, setView]);

  return (
    <View viewId="feedback-confirm">
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/fb_tx.png)' }}
      />
    </View>
  );
}
