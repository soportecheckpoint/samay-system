import type { Socket } from "socket.io-client";
import {
  DEVICE_MANAGER_EVENTS,
  type DeviceConnectionSummary,
  type DeviceLatencyPayload,
  type UnregisteredDevicePayload,
} from "@samay/scape-protocol";
import type { DevicesModule } from "../types.js";

export class DevicesModuleImpl implements DevicesModule {
  private readonly socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  onList(handler: (payload: DeviceConnectionSummary[]) => void): () => void {
    const listener = (payload: { devices: DeviceConnectionSummary[] }) =>
      handler(payload.devices);
    this.socket.on(DEVICE_MANAGER_EVENTS.LIST, listener);
    return () => this.socket.off(DEVICE_MANAGER_EVENTS.LIST, listener);
  }

  onLatency(handler: (payload: DeviceLatencyPayload) => void): () => void {
    this.socket.on(DEVICE_MANAGER_EVENTS.LATENCY, handler);
    return () => this.socket.off(DEVICE_MANAGER_EVENTS.LATENCY, handler);
  }

  onUnregistered(
    handler: (payload: UnregisteredDevicePayload) => void,
  ): () => void {
    this.socket.on(DEVICE_MANAGER_EVENTS.UNREGISTERED, handler);
    return () => this.socket.off(DEVICE_MANAGER_EVENTS.UNREGISTERED, handler);
  }
}
