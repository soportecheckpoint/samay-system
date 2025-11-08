import { SdkConnectionOverlay } from '@samay/tablet-shared-ui';
import { useSocket } from './socket';
import { CameraPreview } from './components/CameraPreview';
import { MessageSelect } from './components/MessageSelect';
import { MessageDisplay } from './components/MessageDisplay';
import { FeedbackInput } from './components/FeedbackForm';
import { FeedbackConfirm } from './components/FeedbackConfirm';
import { PhotoCapture } from './components/PhotoCapture';
import { PhotoMessage } from './components/PhotoMessage';
import { PhotoPreview } from './components/PhotoPreview';
import { FinalMessage } from './components/FinalMessage';
import { HelpView } from './components/HelpMessage';
import { FinalView } from './components/FinalCode';

function App() {
  const { connectionState, retry } = useSocket();

  return (
    <SdkConnectionOverlay
      state={connectionState}
      onRetry={retry}
      className="fixed left-0 top-0 h-full w-full overflow-hidden bg-black"
      copy={{
        connectingTitle: "Conectando con la sala",
        connectingDescription: "Sincronizando con la pantalla principal...",
        errorTitle: "Error de conexion",
        errorDescription: "Revisa la red o reinicia el router.",
        retryLabel: "Intentar de nuevo",
      }}
    >
      <CameraPreview />
      <MessageSelect />
      <MessageDisplay />
      <FeedbackInput />
      <FeedbackConfirm />
      <PhotoCapture />
      <PhotoMessage />
      <PhotoPreview />
      <FinalMessage />
      <HelpView />
      <FinalView />
    </SdkConnectionOverlay>
  );
}

export default App;
