import { useSocket } from './socket';
import { CodeView } from './components/CodeView';
import { MesaView } from './components/MesaView';
import { MessageView } from './components/MessageView';
import { ConfirmView } from './components/ConfirmView';
import { FinalView } from './components/FinalView';

function App() {
  useSocket();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <CodeView />
      <MesaView />
      <MessageView />
      <ConfirmView />
      <FinalView />
    </div>
  );
}

export default App;
