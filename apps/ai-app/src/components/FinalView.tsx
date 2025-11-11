import { useEffect, useState } from "react";
import View from "../view-manager/View";
import { printPDF } from "../socket";
import useViewStore from "../view-manager/view-manager-store";

export function FinalView() {
  const currentView = useViewStore((state) => state.currentView);
  const [canClick, setCanClick] = useState(false);

  const handlePrint = () => {
    if (!canClick) return;

    printPDF();

    setCanClick(false);
  }

  useEffect(() => {
    if (currentView === "final") {
      setCanClick(true);
    }
  }, [currentView]);

  return (
    <View viewId="final">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/ai_final.png)" }}
      />
      <div onClick={handlePrint} className="w-[600px] h-[20%] absolute bottom-[18%] left-1/2 -translate-x-1/2"></div>
    </View>
  );
}
