import './App.css';
import { useSocket } from './socket';
import { HomeView } from './components/HomeView';
import { AudioView } from './components/AudioView';
import { CodeView } from './components/CodeView';
import { DatesView } from './components/DatesView';
import { SelectorView } from './components/SelectorView';
import { FinalView } from './components/FinalView';

export default function App() {
  useSocket();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <HomeView />
      <AudioView />
      <CodeView />
      <DatesView />
      <SelectorView />
      <FinalView />
    </div>
  );
}
