import { useEffectEvent, useRef } from "react";
import { init, Terminal, FitAddon } from "ghostty-web";
import { rpc, WS_URL } from "@/lib/rpc";

export interface GhosttyTerminalOptions {
  terminalId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
  onOutput?: (data: string) => void;
  onClosed?: (reason: string) => void;
}

export interface UseGhosttyTerminalOptions {
  init: () => Promise<void>;
  dispose: () => void;
  resize: () => void;
}

export function useGhosttyTerminal(options: GhosttyTerminalOptions): UseGhosttyTerminalOptions {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const initGhostty = useEffectEvent(async () => {
    // init ghostty wasm
    await init();

    const terminal = new Terminal({
      fontSize: 14,
      fontFamily: "JetBrains Mono, monospace",
      cursorStyle: "block",
      cursorBlink: true,
      theme: {
        background: "#efefef",
        foreground: "#242424",
      },
    });

    terminalRef.current = terminal;

    if (!options.containerRef.current) {
      console.error("Terminal container not found");
      return;
    }

    // Load and activate FitAddon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Open terminal in container
    terminal.open(options.containerRef.current);

    // Fit terminal to container
    fitAddon.fit();

    // Connect to backend via WebSocket
    const result = await rpc.terminal.connectTerminal({ id: options.terminalId }).catch((err) => {
      console.error("Failed to connect to terminal:", err);
      options.onError?.("Failed to connect to terminal");
      return null;
    });

    if (!result?.success) {
      console.error("Failed to connect to terminal");
      options.onError?.("Failed to connect to terminal");
      return;
    }

    const url = `${WS_URL}${result.websocketUrl}`;
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      console.log(`[Terminal ${options.terminalId}] Connected`);
      options.onConnected?.();
      // Send initial resize after fit
      ws.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    });

    ws.addEventListener("message", (event) => {
      console.log("WS MESSAGE", event.data);
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "output") {
            const decoded = atob(message.data);
            terminal.write(decoded);
            options.onOutput?.(decoded);
          } else if (message.type === "closed") {
            console.log(`[Terminal ${options.terminalId}] Closed: ${message.reason}`);
            options.onClosed?.(message.reason);
          } else if (message.type === "error") {
            console.error(`[Terminal ${options.terminalId}] Error: ${message.message}`);
            options.onError?.(message.message);
          }
        } catch {
          // Ignore malformed messages
        }
      }
    });

    ws.addEventListener("error", () => {
      console.error(`[Terminal ${options.terminalId}] WebSocket error`);
      options.onError?.("WebSocket error");
    });

    ws.addEventListener("close", () => {
      console.log(`[Terminal ${options.terminalId}] Disconnected`);
      options.onDisconnected?.();
    });

    // Handle terminal input
    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        const encoded = btoa(data);
        ws.send(JSON.stringify({ type: "input", data: encoded }));
      }
    });

    // Handle resize events from terminal addon
    terminal.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });
  });

  const dispose = useEffectEvent(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (terminalRef.current) {
      terminalRef.current.dispose();
      terminalRef.current = null;
    }
    fitAddonRef.current = null;
  });

  const resize = useEffectEvent(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
      const terminal = terminalRef.current;
      if (terminal && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }),
        );
      }
    }
  });

  return {
    init: initGhostty,
    dispose,
    resize,
  };
}
