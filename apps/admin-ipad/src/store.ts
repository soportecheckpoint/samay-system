import { create } from "zustand";
import {
  DEVICE,
  DEVICE_KIND,
  type AdminConnectionStatus,
  type AdminDeviceSnapshot,
  type AdminLatencySample,
  type AdminEventSnapshot,
  type AdminStateSnapshot,
  type DeviceMetadata
} from "@samay/scape-protocol";

export type ModuleId = "buttons" | "tablet" | "totem" | "printer" | "main-screen";

export type ModuleStatus = "inactive" | "waiting" | "active" | "completed" | "error";

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description: string;
  icon: string;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: "buttons",
    label: "Buttons Game",
    description: "Panel físico de botones",
    icon: "⬢"
  },
  {
    id: "tablet",
    label: "Tablet Feedback",
    description: "Mensajes y pistas para el equipo",
    icon: "▣"
  },
  {
    id: "totem",
    label: "Totem Táctil",
    description: "Contrato interactivo y mensajes secretos",
    icon: "◇"
  },
  {
    id: "printer",
    label: "Laptop e Impresora",
    description: "Puesto de control y generación de pistas",
    icon: "💻"
  },
  {
    id: "main-screen",
    label: "Pantalla Principal",
    description: "Display general con avances y pistas",
    icon: "📺"
  }
];

const MODULE_DEVICE_MAP: Record<ModuleId, string> = {
  buttons: DEVICE.BUTTONS_APP,
  tablet: DEVICE.FEEDBACK,
  totem: DEVICE.TOTEM,
  printer: DEVICE.AI_APP,
  "main-screen": DEVICE.MAIN_SCREEN
};

export interface ModuleState extends ModuleDefinition {
  status: ModuleStatus;
  lastEventTime?: string;
  progress?: number;
  data?: Record<string, unknown>;
  connectionStatus?: AdminConnectionStatus;
  instanceId?: string;
  transport?: string;
  registered?: boolean;
  connectedAt?: number | null;
  lastSeenAt?: number | null;
  metadata?: (DeviceMetadata & Record<string, unknown>) | undefined;
  latencyMs?: number;
  ip?: string;
  lastCommand?: string;
  lastCommandAt?: number;
}

export interface TimerState {
  isRunning: boolean;
  remainingTime: number;
  totalTime: number;
  elapsedTime: number;
  status: "waiting" | "active" | "paused" | "completed" | "failed";
}

interface StorageTimerSnapshot {
  totalMs?: number;
  remainingMs?: number;
  startedAt?: number | null;
  phase?: string;
}

interface StorageStatusSnapshot {
  phase?: string;
  updatedAt?: number;
}

export interface ArduinoState {
  id: string;
  status: "connected" | "disconnected" | "error";
  ip?: string;
  lastHeartbeat?: string;
  lastCommand?: string | null;
  lastCommandTime?: string | null;
  connectionStatus?: AdminConnectionStatus;
  latencyMs?: number;
  instanceId?: string;
  transport?: string;
  metadata?: (DeviceMetadata & Record<string, unknown>) | undefined;
  registered?: boolean;
}

type DeviceGroupMap = Record<string, AdminDeviceSnapshot[]>;
type DeviceSessionMap = Record<string, AdminDeviceSnapshot>;

interface AdminStore {
  connected: boolean;
  snapshot: AdminStateSnapshot | null;
  lastUpdatedAt: number | null;
  devices: AdminDeviceSnapshot[];
  events: AdminEventSnapshot[];
  latencyHistory: AdminLatencySample[];
  deviceGroups: DeviceGroupMap;
  deviceSessions: DeviceSessionMap;
  modules: Record<ModuleId, ModuleState>;
  arduinos: ArduinoState[];
  timer: TimerState;
  gameCompleted: boolean;
  gameFailed: boolean;
  completionTime?: number;
  setConnected: (connected: boolean) => void;
  hydrateAdminState: (snapshot: AdminStateSnapshot) => void;
  reset: () => void;
  updateTimer: (snapshot: StorageTimerSnapshot | null | undefined) => void;
  updateStatus: (snapshot: StorageStatusSnapshot | null | undefined) => void;
  getDevice: (deviceId: string, instanceId?: string) => AdminDeviceSnapshot | undefined;
}

const DEFAULT_TIMER: TimerState = {
  isRunning: false,
  remainingTime: 0,
  totalTime: 0,
  elapsedTime: 0,
  status: "waiting"
};

const mapTimerPhase = (phase?: string): TimerState["status"] => {
  switch (phase) {
    case "running":
      return "active";
    case "paused":
      return "paused";
    case "won":
      return "completed";
    case "lost":
      return "failed";
    default:
      return "waiting";
  }
};

const toSeconds = (value?: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value / 1000));
};

const buildTimerStateFromSnapshot = (snapshot?: StorageTimerSnapshot | null): TimerState => {
  if (!snapshot) {
    return { ...DEFAULT_TIMER };
  }

  const totalSeconds = toSeconds(snapshot.totalMs);
  const remainingSeconds = toSeconds(snapshot.remainingMs);
  const boundedRemaining = totalSeconds > 0 ? Math.min(remainingSeconds, totalSeconds) : remainingSeconds;
  const elapsedSeconds = totalSeconds > 0 ? Math.max(totalSeconds - boundedRemaining, 0) : 0;
  const status = mapTimerPhase(snapshot.phase);

  return {
    isRunning: status === "active",
    totalTime: totalSeconds,
    remainingTime: boundedRemaining,
    elapsedTime: elapsedSeconds,
    status
  };
};

const toIsoString = (value?: number | null): string | undefined => {
  if (typeof value !== "number") {
    return undefined;
  }
  return new Date(value).toISOString();
};

const deriveModuleStatus = (status?: AdminConnectionStatus): ModuleStatus => {
  if (status === "error") {
    return "error";
  }
  if (status === "online") {
    return "active";
  }
  return "inactive";
};

const deriveArduinoStatus = (status?: AdminConnectionStatus): ArduinoState["status"] => {
  if (status === "error") {
    return "error";
  }
  if (status === "online") {
    return "connected";
  }
  return "disconnected";
};

const buildModuleData = (device?: AdminDeviceSnapshot): Record<string, unknown> | undefined => {
  if (!device) {
    return undefined;
  }

  const payload: Record<string, unknown> = {};

  if (typeof device.latencyMs === "number") {
    payload.latencyMs = device.latencyMs;
  }

  if (device.metadata) {
    payload.metadata = { ...device.metadata };
  }

  if (typeof device.registered === "boolean") {
    payload.registered = device.registered;
  }

  if (device.ip) {
    payload.ip = device.ip;
  }

  if (device.lastCommand) {
    payload.lastCommand = device.lastCommand;
  }

  if (typeof device.lastCommandAt === "number") {
    payload.lastCommandAt = device.lastCommandAt;
  }

  return Object.keys(payload).length > 0 ? payload : undefined;
};

const createDefaultModules = (): Record<ModuleId, ModuleState> =>
  MODULES.reduce((acc, module) => {
    acc[module.id] = {
      ...module,
      status: "inactive",
      progress: 0
    };
    return acc;
  }, {} as Record<ModuleId, ModuleState>);

const groupDevicesById = (devices: AdminDeviceSnapshot[]): DeviceGroupMap => {
  const groups: DeviceGroupMap = {};
  for (const device of devices) {
    if (!groups[device.device]) {
      groups[device.device] = [];
    }
    groups[device.device].push(device);
  }

  for (const list of Object.values(groups)) {
    list.sort((a, b) => {
      const bSeen = b.lastSeenAt ?? 0;
      const aSeen = a.lastSeenAt ?? 0;
      if (bSeen !== aSeen) {
        return bSeen - aSeen;
      }
      const bConnected = b.connectedAt ?? 0;
      const aConnected = a.connectedAt ?? 0;
      return bConnected - aConnected;
    });
  }

  return groups;
};

const indexDeviceSessions = (devices: AdminDeviceSnapshot[]): DeviceSessionMap => {
  const sessions: DeviceSessionMap = {};
  for (const device of devices) {
    sessions[`${device.device}::${device.instanceId}`] = device;
  }
  return sessions;
};

const pickPrimaryInstance = (instances: AdminDeviceSnapshot[] | undefined): AdminDeviceSnapshot | undefined => {
  if (!instances || instances.length === 0) {
    return undefined;
  }

  const registered = instances.find((instance) => instance.registered);
  return registered ?? instances[0];
};

const buildModules = (groups: DeviceGroupMap): Record<ModuleId, ModuleState> => {
  const modules = createDefaultModules();

  for (const definition of MODULES) {
    const deviceId = MODULE_DEVICE_MAP[definition.id];
    if (!deviceId) {
      continue;
    }

    const primary = pickPrimaryInstance(groups[deviceId]);
    if (!primary) {
      continue;
    }

    modules[definition.id] = {
      ...modules[definition.id],
      status: deriveModuleStatus(primary.connectionStatus),
      lastEventTime: toIsoString(primary.lastCommandAt ?? primary.lastSeenAt ?? primary.connectedAt),
      data: buildModuleData(primary),
      connectionStatus: primary.connectionStatus,
      instanceId: primary.instanceId,
      transport: primary.transport,
      registered: primary.registered ?? false,
      connectedAt: primary.connectedAt ?? null,
      lastSeenAt: primary.lastSeenAt ?? null,
      metadata: primary.metadata,
      latencyMs: primary.latencyMs,
      ip: primary.ip,
      lastCommand: primary.lastCommand,
      lastCommandAt: primary.lastCommandAt
    };
  }

  return modules;
};

const buildArduinoList = (devices: AdminDeviceSnapshot[]): ArduinoState[] =>
  devices
    .filter((device) => {
      const kind = typeof device.metadata?.kind === "string" ? device.metadata.kind : undefined;
      return device.transport === "http" || kind === DEVICE_KIND.HARDWARE;
    })
    .map((device) => ({
      id: device.device,
      status: deriveArduinoStatus(device.connectionStatus),
      ip: device.ip,
      lastHeartbeat: toIsoString(device.lastSeenAt ?? device.connectedAt),
      lastCommand: device.lastCommand ?? null,
      lastCommandTime: toIsoString(device.lastCommandAt),
      connectionStatus: device.connectionStatus,
      latencyMs: device.latencyMs,
      instanceId: device.instanceId,
      transport: device.transport,
      metadata: device.metadata,
      registered: device.registered ?? false
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

export const useAdminStore = create<AdminStore>((set, get) => ({
  connected: false,
  snapshot: null,
  lastUpdatedAt: null,
  devices: [],
  events: [],
  latencyHistory: [],
  deviceGroups: {},
  deviceSessions: {},
  modules: createDefaultModules(),
  arduinos: [],
  timer: { ...DEFAULT_TIMER },
  gameCompleted: false,
  gameFailed: false,
  completionTime: undefined,

  setConnected: (connected) => set({ connected }),

  hydrateAdminState: (snapshot) => {
    set((state) => {
      if (state.lastUpdatedAt && snapshot.updatedAt <= state.lastUpdatedAt) {
        return {};
      }

      const devices = [...snapshot.devices];
      const events = [...snapshot.events];
  const latencyHistory = Array.isArray(snapshot.latencyHistory) ? [...snapshot.latencyHistory] : [];
      const deviceGroups = groupDevicesById(devices);
      const deviceSessions = indexDeviceSessions(devices);
      const modules = buildModules(deviceGroups);
      const arduinos = buildArduinoList(devices);

      return {
        snapshot,
        devices,
        events,
        latencyHistory,
        deviceGroups,
        deviceSessions,
        modules,
        arduinos,
        lastUpdatedAt: snapshot.updatedAt
      };
    });
  },

  reset: () =>
    set({
      snapshot: null,
      devices: [],
      events: [],
      latencyHistory: [],
      deviceGroups: {},
      deviceSessions: {},
      modules: createDefaultModules(),
      arduinos: [],
      lastUpdatedAt: null,
      timer: { ...DEFAULT_TIMER },
      gameCompleted: false,
      gameFailed: false,
      completionTime: undefined
    }),

  updateTimer: (snapshot) =>
    set(() => ({
      timer: buildTimerStateFromSnapshot(snapshot)
    })),

  updateStatus: (snapshot) =>
    set((state) => {
      const phase = typeof snapshot?.phase === "string" ? snapshot?.phase : undefined;
      const status = mapTimerPhase(phase);
      const completed = status === "completed";
      const failed = status === "failed";
      const completionTime = completed
        ? Math.max(state.timer.totalTime - state.timer.remainingTime, 0)
        : undefined;

      return {
        gameCompleted: completed,
        gameFailed: failed,
        completionTime,
        timer: {
          ...state.timer,
          status,
          isRunning: status === "active"
        }
      };
    }),

  getDevice: (deviceId, instanceId) => {
    const { deviceSessions, deviceGroups } = get();
    if (instanceId) {
      return deviceSessions[`${deviceId}::${instanceId}`];
    }
    const group = deviceGroups[deviceId];
    if (!group || group.length === 0) {
      return undefined;
    }
    return group[0];
  }
}));
