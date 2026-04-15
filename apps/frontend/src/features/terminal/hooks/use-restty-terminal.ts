import { useEffectEvent, useRef } from "react";
import { Restty } from "restty";
import { rpc, WS_BASE } from "@/lib/rpc";
import { getTerminalFontSources, getTerminalTheme } from "../themes";

export interface ResttyTerminalOptions {
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
}

export function useResttyTerminal(options: ResttyTerminalOptions): UseResttyTerminalOptions {
  const resttyRef = useRef<Restty | null>(null);

  const init = useEffectEvent(async () => {
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

    const result = await rpc.terminal.connectTerminal({ id: options.terminalId }).catch((error) => {
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
    options.onConnected?.();
  });

  const dispose = useEffectEvent(() => {
    resttyRef.current?.destroy();
    resttyRef.current = null;
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

  return { init, dispose, resize, setTheme, setFont, setFontSize };
}