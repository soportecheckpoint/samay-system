import View from '../view-manager/View';

export function BadgeView() {
  return (
    <View viewId="badge">
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/insig2.png)' }}
      />
    </View>
  );
}
