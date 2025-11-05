import { useEffect } from 'react';
import View from '../view-manager/View';
import { FIXED_FINAL_CODE, useTabletStore } from '../store';
import { emitMirror } from '../socket';

export function FinalView() {
  const finalCode = useTabletStore((state) => state.finalCode);

  useEffect(() => {
    emitMirror('final_code_ready', 10, { code: finalCode || FIXED_FINAL_CODE });
  }, [finalCode]);

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
