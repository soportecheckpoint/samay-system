import { create } from 'zustand';

export type ModuleId = 'buttons' | 'tablet' | 'totem' | 'printer' | 'main-screen';

export type ModuleStatus = 'inactive' | 'waiting' | 'active' | 'completed' | 'error';

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description: string;
  icon: string;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'buttons',
    label: 'Buttons Game',
    description: 'Panel físico de botones',
    icon: '⬢',
  },
  {
    id: 'tablet',
    label: 'Tablet Feedback',
    description: 'Mensajes y pistas para el equipo',
    icon: '▣',
  },
  {
    id: 'totem',
    label: 'Totem Táctil',
    description: 'Contrato interactivo y mensajes secretos',
    icon: '◇',
  },
  {
    id: 'printer',
    label: 'Laptop e Impresora',
    description: 'Puesto de control y generación de pistas',
    icon: '💻',
  },
  {
    id: 'main-screen',
    label: 'Pantalla Principal',
    description: 'Display general con avances y pistas',
    icon: '📺',
  },
];

const MODULE_MAP = MODULES.reduce((acc, module) => {
  acc[module.id] = module;
  return acc;
}, {} as Record<ModuleId, ModuleDefinition>);

export interface ModuleState extends ModuleDefinition {
  status: ModuleStatus;
  lastEventTime?: string;
  progress?: number;
  data?: Record<string, unknown>;
}

export interface TimerState {
  isRunning: boolean;
  remainingTime: number;
  totalTime: number;
  elapsedTime: number;
  status: 'waiting' | 'active' | 'paused' | 'completed';
}

export interface ArduinoState {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  ip?: string;
  lastHeartbeat?: string;
  lastCommand?: string | null;
  lastCommandTime?: string | null;
}

export interface ServerModulePayload {
  status?: ModuleStatus;
  lastEventTime?: string;
  progress?: number;
  data?: Record<string, unknown>;
}

export interface ServerArduinoPayload {
  deviceId: string;
  status: ArduinoState['status'];
  ip?: string;
  lastHeartbeat?: string;
  lastCommand?: string | null;
  lastCommandTime?: string | null;
}

export interface ServerAdminPayload {
  timer?: Partial<TimerState>;
  modules?: Partial<Record<ModuleId, ServerModulePayload>>;
  arduinos?: ServerArduinoPayload[];
}

interface AdminStore {
  connected: boolean;
  gameCompleted: boolean;
  completionTime?: number;
  timer: TimerState;
  modules: Record<ModuleId, ModuleState>;
  arduinos: ArduinoState[];
  setConnected: (connected: boolean) => void;
  setGameCompleted: (completed: boolean, completionTime?: number) => void;
  hydrateState: (payload: ServerAdminPayload) => void;
  setArduinos: (arduinos: ServerArduinoPayload[]) => void;
}

const DEFAULT_TIMER: TimerState = {
  isRunning: false,
  remainingTime: 0,
  totalTime: 0,
  elapsedTime: 0,
  status: 'waiting',
};

const createDefaultModules = (): Record<ModuleId, ModuleState> =>
  MODULES.reduce((acc, module) => {
    acc[module.id] = {
      ...module,
      status: 'inactive',
      progress: 0,
    };
    return acc;
  }, {} as Record<ModuleId, ModuleState>);

const normalizeArduinoList = (list: ServerArduinoPayload[]): ArduinoState[] =>
  list
    .map((arduino) => ({
      id: arduino.deviceId,
      status: arduino.status ?? 'disconnected',
      ip: arduino.ip,
      lastHeartbeat: arduino.lastHeartbeat,
      lastCommand: arduino.lastCommand ?? null,
      lastCommandTime: arduino.lastCommandTime,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

const isModuleId = (value: string): value is ModuleId =>
  value === 'buttons' || value === 'tablet' || value === 'totem' || value === 'printer' || value === 'main-screen';

const isTimerStatus = (value: unknown): value is TimerState['status'] =>
  value === 'waiting' || value === 'active' || value === 'paused' || value === 'completed';

export const useAdminStore = create<AdminStore>((set) => ({
  connected: false,
  gameCompleted: false,
  completionTime: undefined,
  timer: DEFAULT_TIMER,
  modules: createDefaultModules(),
  arduinos: [],

  setConnected: (connected) => set({ connected }),

  setGameCompleted: (completed, completionTime) => 
    set({ gameCompleted: completed, completionTime }),

  hydrateState: (payload) =>
    set((state) => {
      const nextModules = { ...state.modules };

      if (payload.modules) {
        Object.entries(payload.modules).forEach(([id, modulePayload]) => {
          if (!modulePayload || !isModuleId(id)) {
            return;
          }

          const definition = MODULE_MAP[id];
          const previous = nextModules[id] ?? {
            ...definition,
            status: 'inactive' as ModuleStatus,
          };

          nextModules[id] = {
            ...definition,
            ...previous,
            status: modulePayload.status ?? previous.status ?? 'inactive',
            lastEventTime: modulePayload.lastEventTime ?? previous.lastEventTime,
            progress:
              typeof modulePayload.progress === 'number'
                ? modulePayload.progress
                : previous.progress,
            data: modulePayload.data ?? previous.data,
          };
        });
      }

      const timerPayload = payload.timer ?? {};
      const nextTimer: TimerState = {
        isRunning:
          typeof timerPayload.isRunning === 'boolean'
            ? timerPayload.isRunning
            : state.timer.isRunning,
        remainingTime:
          typeof timerPayload.remainingTime === 'number'
            ? Math.max(timerPayload.remainingTime, 0)
            : state.timer.remainingTime,
        totalTime:
          typeof timerPayload.totalTime === 'number'
            ? Math.max(timerPayload.totalTime, 0)
            : state.timer.totalTime,
        elapsedTime:
          typeof timerPayload.elapsedTime === 'number'
            ? Math.max(timerPayload.elapsedTime, 0)
            : state.timer.elapsedTime,
        status:
          isTimerStatus(timerPayload.status)
            ? timerPayload.status
            : state.timer.status,
      };

      if (nextTimer.totalTime === 0 && nextTimer.remainingTime > 0) {
        nextTimer.totalTime = nextTimer.remainingTime;
      }

      if (nextTimer.remainingTime > nextTimer.totalTime) {
        nextTimer.totalTime = nextTimer.remainingTime;
      }

      const updates: Partial<AdminStore> = {
        modules: nextModules,
        timer: nextTimer,
      };

      if (payload.arduinos) {
        updates.arduinos = normalizeArduinoList(payload.arduinos);
      }

      return updates;
    }),

  setArduinos: (arduinos) => set({ arduinos: normalizeArduinoList(arduinos) }),
}));
