import { SdkConnectionOverlay } from '@samay/tablet-shared-ui';
import { DashboardV2 } from './components/DashboardV2';
import { useScapeStorage } from './hooks/useScapeStorage';

function App() {
  const { connectionState, retry } = useScapeStorage();

  return (
    <SdkConnectionOverlay state={connectionState} onRetry={retry}>
      <DashboardV2 />
    </SdkConnectionOverlay>
  );
}

export default App;
