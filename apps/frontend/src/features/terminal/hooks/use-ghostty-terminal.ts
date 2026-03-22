import { useEffectEvent, useRef } from "react";
import { init as initGhostty, Terminal, FitAddon } from "ghostty-web";
import { rpc } from "@/lib/rpc";

export interface GhosttyTerminalOptions {
  terminalId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
  onOutput?: (data: string) => void;
  onClosed?: (reason: string) => void;
}

export interface UseGhosttyTerminal {
  init: () => Promise<void>;
  dispose: () => void;
  resize: () => void;
}

export function useGhosttyTerminal(options: GhosttyTerminalOptions): UseGhosttyTerminal {
  const { terminalId, containerRef, onConnected, onDisconnected, onError, onOutput, onClosed } =
    options;

  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const init = useEffectEvent(async () => {
    // Initialize WASM
    await initGhostty();

    const terminal = new Terminal({
      fontSize: 14,
      fontFamily: "JetBrains Mono, monospace",
      cursorStyle: "block",
      cursorBlink: true,
      theme: {
        background: "#1e1e2e",
        foreground: "#cdd6f4",
        cursor: "#f5e0dc",
      },
    });

    terminalRef.current = terminal;

    if (!containerRef.current) {
      console.error("Terminal container not found");
      return;
    }

    // Load and activate FitAddon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Open terminal in container
    terminal.open(containerRef.current);

    // Fit terminal to container
    fitAddon.fit();

    // Connect to backend via WebSocket
    const result = await rpc.terminal.connectTerminal({ id: terminalId }).catch((err) => {
      console.error("Failed to connect to terminal:", err);
      onError?.("Failed to connect to terminal");
      return null;
    });

    if (!result?.success) {
      console.error("Failed to connect to terminal");
      onError?.("Failed to connect to terminal");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}${result.websocketUrl}`);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log(`[Terminal ${terminalId}] Connected`);
      onConnected?.();
      // Send initial resize after fit
      ws.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "output") {
            const decoded = atob(message.data);
            terminal.write(decoded);
            onOutput?.(decoded);
          } else if (message.type === "closed") {
            console.log(`[Terminal ${terminalId}] Closed: ${message.reason}`);
            onClosed?.(message.reason);
          } else if (message.type === "error") {
            console.error(`[Terminal ${terminalId}] Error: ${message.message}`);
            onError?.(message.message);
          }
        } catch {
          // Ignore malformed messages
        }
      }
    };

    ws.onerror = () => {
      console.error(`[Terminal ${terminalId}] WebSocket error`);
      onError?.("WebSocket error");
    };

    ws.onclose = () => {
      console.log(`[Terminal ${terminalId}] Disconnected`);
      onDisconnected?.();
    };

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
    init,
    dispose,
    resize,
  };
}
