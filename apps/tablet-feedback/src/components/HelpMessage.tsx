import { useEffect } from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { emitMirror } from '../socket';

export function HelpView() {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);

  useEffect(() => {
    if (currentView === 'help-view') {
      emitMirror('help_prompt', 9, {});
    }
  }, [currentView]);

  const handleContinue = () => {
    emitMirror('help_prompt', 9, {});
    setView('final-view');
  };

  return (
    <View viewId="help-view">
      <div
        className="w-full h-full bg-cover bg-center flex items-center justify-center cursor-pointer"
        onClick={handleContinue}
        style={{ backgroundImage: 'url(/images/fb_help.png)' }}
      />
    </View>
  );
}
