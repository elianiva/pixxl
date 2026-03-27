export interface TerminalServerMessage {
  type: "closed" | "error";
  reason?: string;
  message?: string;
  code?: number;
}

export interface TerminalClientMessage {
  type: "input" | "resize";
  data?: string;
  cols?: number;
  rows?: number;
}

export type TerminalMessage = TerminalServerMessage;
