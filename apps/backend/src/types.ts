import type { TerminalActor, Client } from "./features/terminal/actor";

export interface TerminalWsData {
  type: "terminal";
  terminalId: string;
  actor?: TerminalActor;
  client?: Client;
}

export interface RpcWsData {
  type: "rpc";
}

export type WsData = TerminalWsData | RpcWsData;
