import { useSocket } from "./socket";
import { SdkConnectionOverlay } from "@samay/tablet-shared-ui";
import { IdleScreen } from "./components/IdleScreen";
import { BeforeStartView } from "./components/BeforeStartView";
import { DragDropPhase } from "./components/DragDropPhase";
import { MessageCodeView } from "./components/MessageCodeView";
import { ContractView } from "./components/ContractView";
import { BadgeView } from "./components/BadgeView";

function App() {
  const { connectionState, retry } = useSocket();

  return (
    <SdkConnectionOverlay state={connectionState} onRetry={retry}>
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        <IdleScreen />
        <BeforeStartView />
        <DragDropPhase />
        <MessageCodeView />
        <ContractView />
        <BadgeView />
      </div>
    </SdkConnectionOverlay>
  );
}

export default App;
