export { ScapeClient, createSdk } from "./ScapeClient.js";
export type {
  CoreSocketApi,
  CreateSdkOptions,
  ConnectionModule,
  ConnectionState,
  ConnectionStatus,
  DevicesModule,
  DirectModule,
  MonitorModule,
  PrinterModule,
  ScapeSdk,
  StorageModule,
  StatusModule,
  ClientDependencies
} from "./types.js";
export { useScapeSdk } from "./hooks/useScapeSdk.js";
export type {
  UseScapeSdkOptions,
  UseScapeSdkResult
} from "./hooks/useScapeSdk.js";
