import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';

export function HomeView() {
  const setView = useViewStore((state) => state.setView);

  const handleClick = () => {
    setView('audio');
  };

  return (
    <View viewId="home">
      <div
        onClick={handleClick}
        className="w-full h-full bg-cover bg-center bg-no-repeat cursor-pointer"
        style={{ backgroundImage: 'url(/ai_home.png)' }}
      />
    </View>
  );
}
