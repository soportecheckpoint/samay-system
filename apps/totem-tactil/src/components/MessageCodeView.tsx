import View from '../view-manager/View';

export function MessageCodeView() {
  return (
    <View viewId="message-code">
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/match2.png)' }}
      />
    </View>
  );
}
