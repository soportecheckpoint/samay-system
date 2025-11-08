import './App.css';
import { useSocket } from './socket';
import { SdkConnectionOverlay } from '@samay/tablet-shared-ui';
import { HomeView } from './components/HomeView';
import { AudioView } from './components/AudioView';
import { CodeView } from './components/CodeView';
import { DatesView } from './components/DatesView';
import { SelectorView } from './components/SelectorView';
import { FinalView } from './components/FinalView';

export default function App() {
  const { connectionState, retry } = useSocket();

  return (
    <SdkConnectionOverlay state={connectionState} onRetry={retry}>
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        <HomeView />
        <AudioView />
        <CodeView />
        <DatesView />
        <SelectorView />
        <FinalView />
      </div>
    </SdkConnectionOverlay>
  );
}
