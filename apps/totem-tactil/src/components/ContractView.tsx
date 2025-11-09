import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { notifyContractAccepted } from '../socket';

export function ContractView() {
  const setView = useViewStore((state) => state.setView);

  const handleClick = () => {
    notifyContractAccepted();
    setView('badge');
  };

  return (
    <View viewId="contract">
      <div className="w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/insig1.png)' }}>
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{ width: '85%', height: '12%' }}
          onClick={handleClick}
        />
      </div>
    </View>
  );
}
