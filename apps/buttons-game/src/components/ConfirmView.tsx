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
        className="w-full h-full relative"
        style={{
          backgroundImage: 'url(/bttn_bg_confirm.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div
          className="absolute cursor-pointer"
          onClick={handleClick}
          style={{
            left: '550px',
            bottom: '100px',
            width: '790px',
            height: '120px'
          }}
        />
      </div>
    </View>
  );
};
