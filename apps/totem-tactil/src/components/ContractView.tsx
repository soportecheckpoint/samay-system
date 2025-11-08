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
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat cursor-pointer"
        style={{ backgroundImage: 'url(/insig1.png)' }}
        onClick={handleClick}
      />
    </View>
  );
}
