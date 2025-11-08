import { useEffect } from "react";
import View from "../view-manager/View";
import { printPDF } from "../socket";
import useViewStore from "../view-manager/view-manager-store";

export function FinalView() {
  const currentView = useViewStore((state) => state.currentView);

  useEffect(() => {
    // Solo ejecutar cuando esta vista se hace visible
    if (currentView === "final") {
      // Enviar evento para imprimir PDF
      printPDF();
    }
  }, [currentView]);

  return (
    <View viewId="final">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/ai_final.png)" }}
      />
    </View>
  );
}
