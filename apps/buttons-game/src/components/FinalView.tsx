import React from 'react';
import View from '../view-manager/View';

export const FinalView: React.FC = () => {
  return (
    <View viewId="final">
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: 'url(/bttn_bg_final.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
    </View>
  );
};
