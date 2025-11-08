import View from '../view-manager/View';

export function HomeView() {
  return (
    <View viewId="home">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/ai_home.png)' }}
      />
    </View>
  );
}
