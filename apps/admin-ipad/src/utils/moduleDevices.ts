import { DEVICE } from "@samay/scape-protocol";
import type { ModuleId } from "../store";

const MODULE_DEVICE_MAP: Record<ModuleId, string> = {
  buttons: DEVICE.BUTTONS_APP,
  tablet: DEVICE.FEEDBACK,
  totem: DEVICE.TOTEM,
  printer: DEVICE.AI_APP,
  "main-screen": DEVICE.MAIN_SCREEN,
};

export function resolveModuleDeviceId(moduleId?: ModuleId | null): string | undefined {
  if (!moduleId) {
    return undefined;
  }
  return MODULE_DEVICE_MAP[moduleId];
}
