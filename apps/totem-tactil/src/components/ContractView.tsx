import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';
import { emitContractAccepted, emitWinOverlay } from '../socket';

export function ContractView() {
  const setView = useViewStore((state) => state.setView);

  const handleClick = () => {
    emitWinOverlay('/images/final_win.png', 'final');
    emitContractAccepted();
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
