import View from '../view-manager/View';

export function FinalView() {
  return (
    <View viewId="final-view">
      <div
        className="w-full h-full bg-cover bg-center flex flex-col items-center justify-center gap-8"
        style={{ backgroundImage: 'url(/images/fb_final.png)' }}
      >
      </div>
    </View>
  );
}
