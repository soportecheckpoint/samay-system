import type { ModuleId } from '../../store';

export type MarkerType = 'arduino' | 'module';

export interface MarkerPosition {
  x: number;
  y: number;
}

export interface StageMarker {
  id: string;
  label: string;
  type: MarkerType;
  position: MarkerPosition;
  description?: string;
  deviceId?: string;
  moduleId?: ModuleId;
  icon?: string;
}

export type ConnectionState = 'online' | 'standby' | 'offline' | 'error' | 'unknown';

export interface MarkerStatus {
  connection: ConnectionState;
  label: string;
  helper?: string;
}

export interface MarkerMetaField {
  label: string;
  value?: string | null;
}
