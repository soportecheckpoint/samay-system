export const DEVICE = {
  ADMIN: "admin-ipad",
  MAIN_SCREEN: "main-screen",
  FEEDBACK: "tablet-feedback",
  TOTEM: "totem",
  BUTTONS_APP: "buttons-game",
  AI_APP: "ai-app",
  BUTTONS_ARDUINO: "buttons-arduino"
} as const;

export type DeviceId = (typeof DEVICE)[keyof typeof DEVICE];

export const DEVICE_KIND = {
  APP: "app",
  HARDWARE: "hardware",
  SERVICE: "service"
} as const;

export type DeviceKind = (typeof DEVICE_KIND)[keyof typeof DEVICE_KIND];

export type DeviceTransport = "socket" | "http";

export interface DeviceDescriptor {
  id: DeviceId;
  kind: DeviceKind;
  transport: DeviceTransport;
  label: string;
}

export const DEVICE_CATALOG: Record<DeviceId, DeviceDescriptor> = {
  [DEVICE.ADMIN]: {
    id: DEVICE.ADMIN,
    kind: DEVICE_KIND.APP,
    transport: "socket",
    label: "Admin iPad"
  },
  [DEVICE.MAIN_SCREEN]: {
    id: DEVICE.MAIN_SCREEN,
    kind: DEVICE_KIND.APP,
    transport: "socket",
    label: "Main Screen"
  },
  [DEVICE.FEEDBACK]: {
    id: DEVICE.FEEDBACK,
    kind: DEVICE_KIND.APP,
    transport: "socket",
    label: "Tablet Feedback"
  },
  [DEVICE.TOTEM]: {
    id: DEVICE.TOTEM,
    kind: DEVICE_KIND.APP,
    transport: "socket",
    label: "Totem"
  },
  [DEVICE.BUTTONS_APP]: {
    id: DEVICE.BUTTONS_APP,
    kind: DEVICE_KIND.APP,
    transport: "socket",
    label: "Buttons Game"
  },
  [DEVICE.AI_APP]: {
    id: DEVICE.AI_APP,
    kind: DEVICE_KIND.APP,
    transport: "socket",
    label: "AI App"
  },
  [DEVICE.BUTTONS_ARDUINO]: {
    id: DEVICE.BUTTONS_ARDUINO,
    kind: DEVICE_KIND.HARDWARE,
    transport: "http",
    label: "Buttons Arduino"
  }
};

export interface DeviceMetadata {
  alias?: string;
  version?: string;
  location?: string;
  [key: string]: unknown;
}

export interface DeviceConnectionSnapshot {
  id: DeviceId;
  socketId: string;
  instanceId: string;
  connectedAt: number;
  lastSeenAt: number;
  transport: DeviceTransport;
  metadata?: DeviceMetadata;
  registered: boolean;
  latencyMs?: number;
}
