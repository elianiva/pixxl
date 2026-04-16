import type { WebSocket } from "ws";
import type { TerminalActor, Client } from "./features/terminal/actor";

export interface PtyWsData {
  type: "pty";
  terminalId: string;
  actor?: TerminalActor;
  client?: Client;
  pendingResize?: { cols: number; rows: number };
}

export interface RpcWsData {
  type: "rpc";
}

export type WsData = PtyWsData | RpcWsData;
export type AppSocket = WebSocket & { data?: WsData };
