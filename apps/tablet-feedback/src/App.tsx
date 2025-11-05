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
import { useTabletFlowSync } from './hooks/useTabletFlowSync';

function App() {
  useSocket();
  useTabletFlowSync();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
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
    </div>
  );
}

export default App;
