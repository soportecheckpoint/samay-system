import type { ArduinoState, ModuleId, ModuleState } from '../store';
import { formatRelativeTime } from '../utils/time';
import type { MarkerMetaField, MarkerStatus, StageMarker } from './types.ts';

export type CommunicationType = 'socket' | 'http';

export interface MarkerDetails {
  status: MarkerStatus;
  meta: MarkerMetaField[];
  communicationType?: CommunicationType;
  module?: ModuleState;
  arduino?: ArduinoState;
}

const MODULE_STATUS_LABEL: Record<ModuleState['status'], MarkerStatus> = {
  active: { connection: 'online', label: 'Activo', helper: 'En ejecución' },
  completed: {
    connection: 'online',
    label: 'Completado',
    helper: 'Módulo finalizado',
  },
  waiting: {
    connection: 'standby',
    label: 'En espera',
    helper: 'Listo para iniciar',
  },
  inactive: {
    connection: 'offline',
    label: 'Inactivo',
    helper: 'Sin actividad reciente',
  },
  error: {
    connection: 'error',
    label: 'Error',
    helper: 'Requiere atención',
  },
};

const ARDUINO_STATUS_LABEL: Record<ArduinoState['status'], MarkerStatus> = {
  connected: { connection: 'online', label: 'Conectado', helper: 'Recibiendo heartbeats' },
  disconnected: {
    connection: 'offline',
    label: 'Sin conexión',
    helper: 'Último heartbeat perdido',
  },
  error: { connection: 'error', label: 'Error', helper: 'Revisar logs del dispositivo' },
};

const UNKNOWN_STATUS: MarkerStatus = {
  connection: 'unknown',
  label: 'Sin datos',
  helper: 'Configura un ID válido para enlazar',
};

function buildModuleMeta(module: ModuleState | undefined): MarkerMetaField[] {
  if (!module) {
    return [];
  }

  return [
    { label: 'Último evento', value: formatRelativeTime(module.lastEventTime) },
  ];
}

function buildArduinoMeta(arduino: ArduinoState | undefined): MarkerMetaField[] {
  if (!arduino) {
    return [
      { label: 'Último heartbeat', value: 'Sin registro' },
      { label: 'Último comando', value: 'Sin registro' },
    ];
  }

  return [
    { label: 'Último heartbeat', value: formatRelativeTime(arduino.lastHeartbeat) },
    { label: 'Dirección IP', value: arduino.ip ?? 'Sin registro' },
    { label: 'Último comando', value: arduino.lastCommand ?? 'Sin registro' },
    { label: 'Hora comando', value: formatRelativeTime(arduino.lastCommandTime) },
  ];
}

export function deriveMarkerDetails(
  marker: StageMarker,
  modules: Record<ModuleId, ModuleState>,
  arduinos: ArduinoState[],
): MarkerDetails {
  if (marker.type === 'module' && marker.moduleId) {
    const module = modules[marker.moduleId];
    if (!module) {
      return { 
        status: UNKNOWN_STATUS, 
        meta: [],
        communicationType: 'socket',
      };
    }
    return {
      status: MODULE_STATUS_LABEL[module.status],
      meta: buildModuleMeta(module),
      communicationType: 'socket',
      module,
    };
  }

  if (marker.type === 'arduino' && marker.deviceId) {
    const arduino = arduinos.find((item) => item.id === marker.deviceId);
    if (!arduino) {
      return { 
        status: UNKNOWN_STATUS, 
        meta: buildArduinoMeta(undefined),
        communicationType: 'http',
      };
    }
    return {
      status: ARDUINO_STATUS_LABEL[arduino.status],
      meta: buildArduinoMeta(arduino),
      communicationType: 'http',
      arduino,
    };
  }

  return {
    status: UNKNOWN_STATUS,
    meta: [],
  };
}
