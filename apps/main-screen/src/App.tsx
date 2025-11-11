import './App.css';
import { SdkConnectionOverlay } from '@samay/tablet-shared-ui';
import { Timer } from './components/Timer';
import { PreviousMessage } from './components/PreviousMessage';
import { ViewRenderer } from './components/ViewRenderer';
import VictoryScreen from './components/VictoryScreen';
import { StartScreen } from './components/StartScreen';
import { useMainScreenSdk } from './sdk';
import { useViewStore } from './store';
import { VIEW_CONTENT_MAP } from './viewMapping';

function App() {
  const { connectionState, retry } = useMainScreenSdk();
  const { currentView } = useViewStore();
  const content = VIEW_CONTENT_MAP[currentView];
  
  const backgroundStyle = {
    backgroundImage: `url(${content?.background ?? "/images/background.png"})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };

  return (
    <div style={backgroundStyle} className="fixed inset-0">
      <SdkConnectionOverlay
        state={connectionState}
        onRetry={retry}
        className="fixed h-full w-full overflow-hidden font-sans text-white"
        copy={{
          connectingTitle: "Conectando con el router",
          connectingDescription: "Esperando senal del servidor principal...",
          errorTitle: "Sin conexion",
          errorDescription: "Revisa la red y vuelve a intentarlo.",
          retryLabel: "Reintentar",
        }}
      >
        <div className="relative z-10 flex min-h-screen flex-col px-6 py-12">
        <div className="mx-auto flex w-full flex-1 flex-col gap-12 lg:flex-row">
          <div className="flex w-full flex-col gap-10 lg:w-1/2">
            <Timer />
            <PreviousMessage />
          </div>

          <div className="w-1/2">
            <ViewRenderer />
          </div>
        </div>
      </div>

      <VictoryScreen />
      <StartScreen />
    </SdkConnectionOverlay>
    </div>
  );
}

export default App;
