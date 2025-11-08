import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';

export function HelpView() {
  const setView = useViewStore((state) => state.setView);

  const handleContinue = () => {
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
