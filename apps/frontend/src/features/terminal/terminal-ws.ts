import { WS_URL } from "@/lib/rpc";
import type { TerminalMessage, TerminalClientMessage } from "@pixxl/shared/types";

type TerminalEventHandlers = {
  onOutput: (data: Uint8Array) => void;
  onClose: (reason: string) => void;
  onError: (message: string) => void;
};

export function createTerminalConnection(terminalId: string, handlers: TerminalEventHandlers) {
  const ws = new WebSocket(`${WS_URL}/${terminalId}`);

  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    console.log(`[Terminal ${terminalId}] Connected`);
  };

  ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      // Raw binary terminal output
      handlers.onOutput(new Uint8Array(event.data));
      return;
    }

    try {
      const message: TerminalMessage = JSON.parse(event.data);

      switch (message.type) {
        case "closed":
          handlers.onClose(message.reason ?? "Unknown reason");
          break;
        case "error":
          handlers.onError(message.message ?? "Unknown error");
          break;
      }
    } catch {
      console.error("[Terminal] Failed to parse message:", event.data);
    }
  };

  ws.onerror = () => {
    handlers.onError("WebSocket connection error");
  };

  ws.onclose = (event) => {
    console.log(`[Terminal ${terminalId}] Closed: ${event.reason}`);
    if (!event.wasClean) {
      handlers.onClose(event.reason || "Connection closed unexpectedly");
    }
  };

  const send = (message: TerminalClientMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const sendInput = (data: string) => {
    send({ type: "input", data });
  };

  const sendResize = (cols: number, rows: number) => {
    send({ type: "resize", cols, rows });
  };

  const close = () => {
    ws.close();
  };

  return { sendInput, sendResize, close, ws };
}
