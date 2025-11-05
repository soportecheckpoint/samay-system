import { useSocket } from './socket';
import { IdleScreen } from './components/IdleScreen';
import { DragDropPhase } from './components/DragDropPhase';
import { MessageCodeView } from './components/MessageCodeView';
import { ContractView } from './components/ContractView';
import { BadgeView } from './components/BadgeView';

function App() {
  useSocket();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <IdleScreen />
      <DragDropPhase />
      <MessageCodeView />
      <ContractView />
      <BadgeView />
    </div>
  );
}

export default App;
