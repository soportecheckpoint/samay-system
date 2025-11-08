import { useSocket } from './socket';
import { SdkConnectionOverlay } from '@samay/tablet-shared-ui';
import { CodeView } from './components/CodeView';
import { MesaView } from './components/MesaView';
import { MessageView } from './components/MessageView';
import { ConfirmView } from './components/ConfirmView';
import { FinalView } from './components/FinalView';

function App() {
  const { connectionState, retry } = useSocket();

  return (
    <SdkConnectionOverlay state={connectionState} onRetry={retry}>
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        <CodeView />
        <MesaView />
        <MessageView />
        <ConfirmView />
        <FinalView />
      </div>
    </SdkConnectionOverlay>
  );
}

export default App;
