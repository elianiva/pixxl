import { useEffectEvent, useRef } from "react";
import { init, Terminal, FitAddon } from "ghostty-web";
import { rpc } from "@/lib/rpc";
import { WS_URL } from "@/lib/rpc";
import { terminalFonts, terminalThemes } from "../themes";

export interface GhosttyTerminalOptions {
  terminalId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  themeId: string;
  fontId: string;
  fontSize: number;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
  onOutput?: (data: string) => void;
  onClosed?: (reason: string) => void;
  onDead?: (exitCode?: number) => void;
}

export interface UseGhosttyTerminalOptions {
  init: () => Promise<void>;
  dispose: () => void;
  resize: () => void;
  setTheme: (themeId: string) => void;
  setFont: (fontId: string) => void;
  setFontSize: (size: number) => void;
}

export function useGhosttyTerminal(options: GhosttyTerminalOptions): UseGhosttyTerminalOptions {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const initGhostty = useEffectEvent(async () => {
    // init ghostty wasm
    await init();

    // Get theme and font from options
    const theme =
      terminalThemes.find((t) => t.id === options.themeId) ??
      terminalThemes.find((t) => t.id === "catppuccin-mocha")!;
    const font =
      terminalFonts.find((f) => f.id === options.fontId) ??
      terminalFonts.find((f) => f.id === "jetbrains-mono")!;
    const fontSize = options.fontSize;

    const terminal = new Terminal({
      fontSize,
      fontFamily: font.family,
      cursorStyle: "block",
      cursorBlink: true,
      theme: theme.theme,
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

    const wsUrl = `${WS_URL}/${options.terminalId}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      console.log(`[Terminal ${options.terminalId}] Connected`);
      options.onConnected?.();
      // Request scrollback sync for reattach scenarios
      ws.send(JSON.stringify({ type: "sync" }));
      // Send initial resize after sync
      ws.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    });

    ws.addEventListener("message", (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Raw binary terminal output
        const data = new Uint8Array(event.data);
        terminal.write(data);
        options.onOutput?.(new TextDecoder().decode(data));
      } else if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "closed") {
            console.log(`[Terminal ${options.terminalId}] Closed: ${message.reason}`);
            options.onClosed?.(message.reason);
          } else if (message.type === "error") {
            console.error(`[Terminal ${options.terminalId}] Error: ${message.message}`);
            options.onError?.(message.message);
          } else if (message.type === "dead") {
            console.log(`[Terminal ${options.terminalId}] Process exited: ${message.exitCode}`);
            // Write visible message to terminal
            terminal.write(
              `\r\n\x1b[31m[Session ended - exit code ${message.exitCode ?? "unknown"}]\x1b[0m\r\n`,
            );
            options.onDead?.(message.exitCode);
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

  const setTheme = useEffectEvent((themeId: string) => {
    const theme = terminalThemes.find((t) => t.id === themeId);
    if (!theme) return;

    const terminal = terminalRef.current;
    if (terminal) {
      terminal.options.theme = theme.theme;
    }
  });

  const setFont = useEffectEvent((fontId: string) => {
    const font = terminalFonts.find((f) => f.id === fontId);
    if (!font) return;

    const terminal = terminalRef.current;
    if (terminal) {
      terminal.options.fontFamily = font.family;
    }
  });

  const setFontSize = useEffectEvent((size: number) => {
    const terminal = terminalRef.current;
    if (terminal) {
      terminal.options.fontSize = size;
    }
  });

  return {
    init: initGhostty,
    dispose,
    resize,
    setTheme,
    setFont,
    setFontSize,
  };
}
