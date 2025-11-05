import { useEffect } from 'react';
import View from '../view-manager/View';
import { printPDF, notifyModuleCompleted } from '../socket';

export function FinalView() {
  useEffect(() => {
    // Enviar evento para imprimir PDF y notificar finalización
    printPDF();
    notifyModuleCompleted();
  }, []);

  return (
    <View viewId="final">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/ai_final.png)' }}
      />
    </View>
  );
}
