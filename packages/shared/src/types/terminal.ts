export interface TerminalServerMessage {
  type: "closed" | "error" | "dead";
  reason?: string;
  message?: string;
  code?: number;
  exitCode?: number;
}

export interface TerminalClientMessage {
  type: "input" | "resize" | "sync";
  data?: string;
  cols?: number;
  rows?: number;
}

export type TerminalMessage = TerminalServerMessage;
