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
        className="w-full h-full bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: 'url(/images/fb_help.png)' }}
      >
        <div
          className="cursor-pointer"
          onClick={handleContinue}
          style={{ width: 400, height: 100 }}
        />
      </div>
    </View>
  );
}
