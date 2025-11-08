import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";

export type SocketFactory = (
  url: string,
  options: Partial<ManagerOptions & SocketOptions>
) => Socket;

export const defaultSocketFactory: SocketFactory = (url, options) => io(url, options);
