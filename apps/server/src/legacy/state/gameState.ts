export interface Arduino {
  id: string;
  ip: string;
  port: number;
  connectedAt: string;
  lastHeartbeat: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCommand: string | null;
  lastCommandTime: string | null;
}

export interface Session {
  id: string;
  startTime: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  teamName: string;
  elapsedTime: number;
  totalTime: number;
  remainingTime: number;
}

export interface GameModule {
  status: 'waiting' | 'active' | 'completed' | 'error';
  progress: number;
  lastEventTime: string;
  data: any;
}

export interface Client {
  appType: string;
  sessionId: string;
  connectedAt: string;
}

export interface GameState {
  arduinos: Record<string, Arduino>;
  session: Session;
  games: Record<string, GameModule>;
  clients: Record<string, Client>;
}

// Estado global del servidor
export const gameState: GameState = {
  arduinos: {},
  session: {
    id: 'SESSION_001',
    startTime: new Date().toISOString(),
    status: 'waiting',
    teamName: '',
    elapsedTime: 0,
    totalTime: 0,
    remainingTime: 0
  },
  games: {},
  clients: {}
};

export const updateArduino = (id: string, data: Partial<Arduino>) => {
  if (!gameState.arduinos[id]) {
    gameState.arduinos[id] = {
      id,
      ip: '',
      port: 8080,
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      status: 'connected',
      lastCommand: null,
      lastCommandTime: null
    };
  }
  gameState.arduinos[id] = { ...gameState.arduinos[id], ...data };
};

export const updateGameModule = (moduleId: string, data: Partial<GameModule>) => {
  if (!gameState.games[moduleId]) {
    gameState.games[moduleId] = {
      status: 'waiting',
      progress: 0,
      lastEventTime: new Date().toISOString(),
      data: {}
    };
  }
  gameState.games[moduleId] = { ...gameState.games[moduleId], ...data };
};

export const addClient = (socketId: string, appType: string, sessionId: string) => {
  gameState.clients[socketId] = {
    appType,
    sessionId,
    connectedAt: new Date().toISOString()
  };
};

export const removeClient = (socketId: string) => {
  delete gameState.clients[socketId];
};
