import type { TerminalActor, Client } from "./features/terminal/actor";

export interface PtyWsData {
  type: "pty";
  terminalId: string;
  actor?: TerminalActor;
  client?: Client;
}

export interface RpcWsData {
  type: "rpc";
}

export type WsData = PtyWsData | RpcWsData;
