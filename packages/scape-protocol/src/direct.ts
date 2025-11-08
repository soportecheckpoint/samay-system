import { DEVICE, type DeviceId } from "./devices.js";

export interface ButtonState {
  id: string;
  pressed: boolean;
  completed: boolean;
}

export interface TabletActivityPayload {
  currentView: string;
  input?: string;
  photoPath?: string | null;
  recognitionPath?: string | null;
}

export interface ArduinoCommandPayload {
  metadata?: Record<string, unknown>;
}

type DeviceSpecificPayloads = {
  [DEVICE.MAIN_SCREEN]: {
    tabletActivity: TabletActivityPayload;
    showImage: {
      image: "notification" | "accept";
    };
  };
  [DEVICE.FEEDBACK]: Record<string, never>;
  [DEVICE.ADMIN]: Record<string, never>;
  [DEVICE.TOTEM]: {
    start: {
      phase: 1 | 2;
    };
  };
  [DEVICE.BUTTONS_APP]: {
    setState: {
      buttons: ButtonState[];
      completed?: boolean;
    };
    command: {
      action: "skip-code" | "force-complete";
      origin?: string;
      markerId?: string;
      [key: string]: unknown;
    };
  };
  [DEVICE.AI_APP]: {
    start: void;
  };
  [DEVICE.BUTTONS_ARDUINO]: {
    start: ArduinoCommandPayload;
    reset: ArduinoCommandPayload;
  };
};


export type DirectCommandPayloads = DeviceSpecificPayloads & Record<string, Record<string, never>>;

export type DeviceCommandName<TTarget extends DeviceId> = keyof DirectCommandPayloads[TTarget];

export type DirectCommandPayload<
  TTarget extends DeviceId,
  TCommand extends DeviceCommandName<TTarget>
> = DirectCommandPayloads[TTarget][TCommand];

export const DEVICE_COMMAND_EVENTS: Record<string, Record<string, string>> = {
  [DEVICE.MAIN_SCREEN]: {
    tabletActivity: "tablet-activity",
    showImage: "show-image"
  },
  [DEVICE.FEEDBACK]: {},
  [DEVICE.ADMIN]: {},
  [DEVICE.TOTEM]: {
    start: "start"
  },
  [DEVICE.BUTTONS_APP]: {
    setState: "set-state",
    command: "command"
  },
  [DEVICE.AI_APP]: {
    start: "start"
  },
  [DEVICE.BUTTONS_ARDUINO]: {
    start: "start",
    reset: "reset"
  }
};

export type CommandPayloadArgs<TPayload> = TPayload extends void ? [] : [payload: TPayload];

export type ExecuteTarget<TTarget extends DeviceId> = {
  [TCommand in DeviceCommandName<TTarget>]: (
    ...args: CommandPayloadArgs<DirectCommandPayload<TTarget, TCommand>>
  ) => void;
};

export type DeviceEventRegistry = typeof DEVICE_COMMAND_EVENTS;

export type DirectCommandEventName<
  TTarget extends DeviceId,
  TCommand extends DeviceCommandName<TTarget>
> = TCommand extends keyof DeviceEventRegistry[TTarget]
  ? DeviceEventRegistry[TTarget][TCommand]
  : never;
