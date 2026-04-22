import { useEffectEvent, useRef } from "react";
import { Restty } from "restty";
import { rpc, WS_BASE } from "@/lib/rpc";
import { getTerminalFontSources, getTerminalTheme } from "../themes";

export interface ResttyTerminalOptions {
  projectId: string;
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

export interface UseResttyTerminalOptions {
  init: () => Promise<void>;
  dispose: () => void;
  resize: () => void;
  setTheme: (themeId: string) => void;
  setFont: (fontId: string) => void;
  setFontSize: (size: number) => void;
  reconnect: () => Promise<void>;
}

export function useResttyTerminal(options: ResttyTerminalOptions): UseResttyTerminalOptions {
  const resttyRef = useRef<Restty | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDisposedRef = useRef(false);

  const computeDimensions = () => {
    const root = options.containerRef.current;
    if (!root) return undefined;
    const rect = root.getBoundingClientRect();
    const cellWidth = options.fontSize * 0.6;
    const cellHeight = options.fontSize * 1.25;
    return {
      cols: Math.max(1, Math.floor(rect.width / cellWidth)),
      rows: Math.max(1, Math.floor(rect.height / cellHeight)),
    };
  };

  const startPolling = useEffectEvent((restty: Restty) => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollRef.current = setInterval(() => {
      const current = resttyRef.current;
      if (!current || current !== restty || isDisposedRef.current) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return;
      }
      if (!current.isPtyConnected()) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        void attemptReconnect(restty);
      }
    }, 1000);
  });

  const attemptReconnect = useEffectEvent(async (restty: Restty) => {
    if (isDisposedRef.current) return;
    options.onDisconnected?.();

    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (isDisposedRef.current) return;

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, delay));

      if (isDisposedRef.current) return;

      try {
        const { state } = await rpc.terminal.getTerminalSessionState({ id: options.terminalId });

        if (state === "dead" || state === "closed" || state === "none") {
          options.onDead?.();
          return;
        }

        const dims = computeDimensions();
        const result = await rpc.terminal.connectTerminal({
          id: options.terminalId,
          projectId: options.projectId,
          ...dims,
        });
        if (!result?.success) continue;

        const websocketUrl = result.websocketUrl.startsWith("ws")
          ? result.websocketUrl
          : `${WS_BASE}${result.websocketUrl}`;
        restty.connectPty(websocketUrl);

        await new Promise((r) => setTimeout(r, 500));
        if (restty.isPtyConnected()) {
          options.onConnected?.();
          startPolling(restty);
          return;
        }
      } catch {
        // RPC failed, continue to next retry
      }
    }

    options.onDead?.();
  });

  const init = useEffectEvent(async () => {
    isDisposedRef.current = false;
    const root = options.containerRef.current;
    if (!root) {
      options.onError?.("Terminal container not found");
      return;
    }

    const restty = new Restty({
      root,
      createInitialPane: true,
      shortcuts: true,
      defaultContextMenu: true,
      appOptions: {
        renderer: "auto",
        fontPreset: "none",
        fontSize: options.fontSize,
        ligatures: false,
        autoResize: true,
        touchSelectionMode: "long-press",
      },
      fontSources: getTerminalFontSources(options.fontId),
    });

    resttyRef.current = restty;

    const theme = getTerminalTheme(options.themeId);
    if (theme) restty.applyTheme(theme);

    const dims = computeDimensions();

    const result = await rpc.terminal.connectTerminal({
      id: options.terminalId,
      projectId: options.projectId,
      ...dims,
    }).catch((error) => {
      console.error("Failed to connect to terminal:", error);
      options.onError?.("Failed to connect to terminal");
      return null;
    });

    if (!result?.success) {
      restty.destroy();
      resttyRef.current = null;
      options.onError?.("Failed to connect to terminal");
      return;
    }

    const websocketUrl = result.websocketUrl.startsWith("ws")
      ? result.websocketUrl
      : `${WS_BASE}${result.websocketUrl}`;
    restty.connectPty(websocketUrl);

    // Send exact dimensions as soon as the PTY transport connects
    const settleResize = setInterval(() => {
      if (restty.isPtyConnected()) {
        restty.updateSize();
        clearInterval(settleResize);
      }
    }, 50);
    setTimeout(() => clearInterval(settleResize), 3000);

    options.onConnected?.();
    startPolling(restty);
  });

  const dispose = useEffectEvent(() => {
    isDisposedRef.current = true;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    resttyRef.current?.destroy();
    resttyRef.current = null;
  });

  const reconnect = useEffectEvent(async () => {
    const restty = resttyRef.current;
    if (!restty) return;
    if (restty.isPtyConnected()) return;

    try {
      const dims = computeDimensions();
      const result = await rpc.terminal.connectTerminal({
        id: options.terminalId,
        projectId: options.projectId,
        ...dims,
      });
      if (!result?.success) return;

      const websocketUrl = result.websocketUrl.startsWith("ws")
        ? result.websocketUrl
        : `${WS_BASE}${result.websocketUrl}`;
      restty.connectPty(websocketUrl);

      const settleResize = setInterval(() => {
        if (restty.isPtyConnected()) {
          restty.updateSize();
          clearInterval(settleResize);
        }
      }, 50);
      setTimeout(() => clearInterval(settleResize), 3000);

      startPolling(restty);
    } catch {
      // ignore
    }
  });

  const resize = useEffectEvent(() => {
    resttyRef.current?.updateSize();
  });

  const setTheme = useEffectEvent((themeId: string) => {
    const theme = getTerminalTheme(themeId);
    if (theme) resttyRef.current?.applyTheme(theme);
  });

  const setFont = useEffectEvent(async (fontId: string) => {
    const restty = resttyRef.current;
    if (!restty) return;
    await restty.setFontSources(getTerminalFontSources(fontId));
    restty.updateSize();
  });

  const setFontSize = useEffectEvent((size: number) => {
    const restty = resttyRef.current;
    if (!restty) return;
    restty.setFontSize(size);
    restty.updateSize();
  });

  return { init, dispose, resize, setTheme, setFont, setFontSize, reconnect };
}