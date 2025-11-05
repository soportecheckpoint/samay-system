import { useState, useEffect } from 'react';
import { SERVER_URL, socket, sendCustomEvent } from '../socket';
import { formatRelativeTime } from '../utils/time';

interface ButtonState {
  id: number;
  pressed: boolean;
  timestamp?: string;
}

interface GameState {
  phase: 'code-entry' | 'waiting' | 'active' | 'completed';
  buttons: ButtonState[];
  lastPressed?: number;
  pressedCount: number;
}

const API_BASE = SERVER_URL.replace(/\/$/, '');

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: unknown = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error('La respuesta del servidor no es JSON válido');
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : `Error ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export function ButtonsSimulator() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    buttons: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, pressed: false })),
    pressedCount: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Array<{ id: string; type: 'success' | 'error' | 'info'; message: string; timestamp: string }>>([]);

  const addFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    const feedbackItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    setFeedback(prev => [feedbackItem, ...prev].slice(0, 6));
  };

  // Listen for reset events from the server
  useEffect(() => {
    const handleButtonsReset = () => {
      const resetState = {
        phase: 'waiting' as const,
        buttons: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, pressed: false })),
        pressedCount: 0,
        lastPressed: undefined,
      };
      
      setGameState(resetState);
      addFeedback('info', 'Reset recibido desde el servidor');
      setLastAction(`Reset automático: ${new Date().toISOString()}`);
    };

    const handleGameReset = () => {
      handleButtonsReset();
    };

    socket.on('buttons:reset', handleButtonsReset);
    socket.on('game:reset', handleGameReset);

    return () => {
      socket.off('buttons:reset', handleButtonsReset);
      socket.off('game:reset', handleGameReset);
    };
  }, [addFeedback]);

  // Simulate Arduino connection
  const handleConnect = async () => {
    setBusyAction('connect');
    try {
      await postJson('/connect', {
        id: 'buttons-arduino',
        ip: '127.0.0.1',
        port: 8080,
      });
      
      setIsConnected(true);
      setLastAction(`Conectado: ${new Date().toISOString()}`);
      addFeedback('success', 'Arduino de botones conectado exitosamente');
    } catch (error) {
      addFeedback('error', error instanceof Error ? error.message : 'Error al conectar Arduino');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setLastAction(`Desconectado: ${new Date().toISOString()}`);
    addFeedback('info', 'Arduino de botones desconectado');
  };

  // Toggle button press/release
  const handleButtonToggle = async (buttonId: number) => {
    if (!isConnected) {
      addFeedback('error', 'Conecta el Arduino antes de simular botones');
      return;
    }

    setBusyAction(`button-${buttonId}`);
    try {
      // Toggle button state
      const currentButton = gameState.buttons.find(btn => btn.id === buttonId);
      const newPressed = !currentButton?.pressed;
      
      const newButtons = gameState.buttons.map(btn => 
        btn.id === buttonId 
          ? { ...btn, pressed: newPressed, timestamp: new Date().toISOString() }
          : btn
      );
      
      const newGameState = {
        ...gameState,
        buttons: newButtons,
        lastPressed: buttonId,
        pressedCount: newButtons.filter(b => b.pressed).length,
        phase: newButtons.filter(b => b.pressed).length === 10 ? 'completed' as const : gameState.phase,
      };
      
      setGameState(newGameState);

      // Send socket event using the proper admin socket
      sendCustomEvent('buttons:state-changed', {
        buttons: newButtons,
        lastPressed: buttonId,
        timestamp: new Date().toISOString(),
      }, (result) => {
        if (!result.ok) {
          console.error('Failed to send button state:', result.error);
        }
      });

      setLastAction(`Botón ${buttonId} ${newPressed ? 'presionado' : 'liberado'}: ${new Date().toISOString()}`);
      addFeedback('success', `Botón ${buttonId} ${newPressed ? 'presionado' : 'liberado'} exitosamente`);
    } catch (error) {
      addFeedback('error', error instanceof Error ? error.message : 'Error al cambiar estado del botón');
    } finally {
      setBusyAction(null);
    }
  };

  // Reset game state
  const handleReset = async () => {
    const resetState = {
      phase: 'waiting' as const,
      buttons: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, pressed: false })),
      pressedCount: 0,
      lastPressed: undefined,
    };
    
    setGameState(resetState);

    // Send reset event to the buttons-game app
    try {
      sendCustomEvent('buttons:reset', {
        timestamp: new Date().toISOString(),
      }, (result) => {
        if (result.ok) {
          addFeedback('success', 'Reset enviado a la aplicación de botones');
        } else {
          addFeedback('error', 'Error al enviar reset: ' + (result.error || 'Unknown error'));
        }
      });
    } catch (error) {
      addFeedback('error', 'Error al enviar reset');
    }
    
    setLastAction(`Juego reiniciado: ${new Date().toISOString()}`);
    addFeedback('info', 'Estado del simulador reiniciado');
  };

  // Start game
  const handleStartGame = async () => {
    if (!isConnected) {
      addFeedback('error', 'Conecta el Arduino antes de iniciar el juego');
      return;
    }

    setBusyAction('start');
    try {
      const newGameState = { ...gameState, phase: 'active' as const };
      setGameState(newGameState);

      await postJson('/dispatch', {
        arduinoId: 'buttons-arduino',
        event: 'game:start',
        data: { phase: 'active', timestamp: new Date().toISOString() },
      });

      setLastAction(`Juego iniciado: ${new Date().toISOString()}`);
      addFeedback('success', 'Juego de botones iniciado');
    } catch (error) {
      addFeedback('error', error instanceof Error ? error.message : 'Error al iniciar juego');
    } finally {
      setBusyAction(null);
    }
  };

  const getButtonStyle = (button: ButtonState) => {
    if (button.pressed) {
      return 'bg-emerald-500/90 border-emerald-400/50 text-white shadow-emerald-500/30 shadow-lg';
    }
    if (gameState.lastPressed === button.id) {
      return 'bg-yellow-500/90 border-yellow-400/50 text-white shadow-yellow-500/30 animate-pulse';
    }
    return 'bg-slate-700/90 border-slate-600/50 text-slate-300 hover:bg-slate-600/90 hover:border-slate-500/50';
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Simulador de Botones</h2>
        <p className="text-sm text-slate-400">
          Controla el Arduino de botones físicos y simula las interacciones del juego.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main Control Panel */}
        <div className="space-y-6">
          {/* Connection Controls */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Estado de Conexión</h3>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isConnected 
                  ? 'bg-emerald-500/10 text-emerald-200' 
                  : 'bg-slate-500/10 text-slate-300'
              }`}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnected || busyAction === 'connect'}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  busyAction === 'connect'
                    ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                    : isConnected
                    ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                    : 'bg-emerald-500 text-white hover:bg-emerald-400'
                }`}
              >
                {busyAction === 'connect' ? 'Conectando...' : 'Conectar Arduino'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={!isConnected}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  !isConnected
                    ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                    : 'bg-red-500 text-white hover:bg-red-400'
                }`}
              >
                Desconectar
              </button>
            </div>
          </div>

          {/* Game Controls */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Control del Juego</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleStartGame}
                disabled={!isConnected || gameState.phase === 'active' || busyAction === 'start'}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  busyAction === 'start'
                    ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                    : !isConnected || gameState.phase === 'active'
                    ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                    : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                {busyAction === 'start' ? 'Iniciando...' : 'Iniciar Juego'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!isConnected}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  !isConnected
                    ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                    : 'border border-white/10 bg-black/40 text-slate-100 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                Reiniciar
              </button>
            </div>
          </div>

          {/* Virtual Buttons Table */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Mesa de Botones Virtual</h3>
            <div className="grid grid-cols-5 gap-3">
              {gameState.buttons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => handleButtonToggle(button.id)}
                  disabled={!isConnected || busyAction === `button-${button.id}`}
                  className={`
                    aspect-square rounded-xl border-2 p-2 text-center transition-all
                    ${getButtonStyle(button)}
                    ${!isConnected ? 'cursor-not-allowed' : 'hover:scale-105'}
                    shadow-lg
                  `}
                >
                  <div className="text-xs font-medium opacity-75">BTN</div>
                  <div className="text-lg font-bold">{button.id}</div>
                  <div className="text-xs">
                    {busyAction === `button-${button.id}` ? '⏳' : button.pressed ? '✓' : '○'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="space-y-6">
          {/* Game Status */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Estado del Juego</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Fase:</span>
                <span className="font-semibold text-white capitalize">{gameState.phase}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Progreso:</span>
                <span className="font-semibold text-white">{gameState.pressedCount}/10</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Último botón:</span>
                <span className="font-semibold text-white">
                  {gameState.lastPressed ? `#${gameState.lastPressed}` : '—'}
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${(gameState.pressedCount / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Actividad Reciente</h3>
            {feedback.length === 0 ? (
              <p className="text-xs text-slate-400">No hay actividad registrada</p>
            ) : (
              <div className="space-y-2">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl p-2 text-xs ${
                      item.type === 'success' 
                        ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                        : item.type === 'error'
                        ? 'bg-red-500/10 text-red-200 border border-red-500/20'
                        : 'bg-blue-500/10 text-blue-200 border border-blue-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{item.message}</span>
                      <span className="text-[10px] opacity-60">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last Action */}
          {lastAction && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Última Acción</h3>
              <p className="text-xs text-slate-300 font-mono">{lastAction}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}