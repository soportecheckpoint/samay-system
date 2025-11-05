import { useSocket } from './socket';
import { Dashboard } from './components/Dashboard';

function App() {
  useSocket();

  return <Dashboard />;
}

export default App;
