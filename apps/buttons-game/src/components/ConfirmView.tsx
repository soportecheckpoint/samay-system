import React from 'react';
import View from '../view-manager/View';
import useViewStore from '../view-manager/view-manager-store';

export const ConfirmView: React.FC = () => {
  const setView = useViewStore((state) => state.setView);

  const handleClick = () => {
    setView('final');
  };

  return (
    <View viewId="confirm">
      <div 
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
        style={{
          backgroundImage: 'url(/bttn_bg_confirm.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
    </View>
  );
};
