import './App.css';
import { useSocket } from './socket';
import { Timer } from './components/Timer';
import { PreviousMessage } from './components/PreviousMessage';
import { FeedbackMessage } from './components/FeedbackMessage';
import VictoryScreen from './components/VictoryScreen';
import { TabletStateImage } from './components/TabletStateImage';

function App() {
  useSocket();

  return (
    <div className="app-shell relative min-h-screen overflow-hidden font-sans text-white">
      <div className="animated-gradient" aria-hidden="true" />
      <div className="gradient-overlay" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="mx-auto flex w-full flex-1 flex-col gap-12 px-6 py-12 md:px-10 lg:max-w-6xl lg:flex-row">
          <div className="flex w-full flex-col gap-10 lg:w-1/2">
            <Timer />
            <PreviousMessage />
          </div>

          <div className="flex w-full items-center justify-center lg:w-1/2">
            <TabletStateImage />
          </div>
        </div>
      </div>

      <FeedbackMessage />
      <VictoryScreen />
    </div>
  );
}

export default App;
