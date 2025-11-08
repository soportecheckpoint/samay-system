import { useEffect } from "react";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";

export function MessageCodeView() {
  const currentView = useViewStore((state) => state.currentView);
  const setView = useViewStore((state) => state.setView);

  useEffect(() => {
    if (currentView !== "message-code") {
      return;
    }

    const timer = setTimeout(() => {
      setView("contract");
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentView, setView]);

  return (
    <View viewId="message-code">
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/match2.png)' }}
      />
    </View>
  );
}
