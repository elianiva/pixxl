import { useEffect, useRef, useState, useCallback } from "react";
import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useResttyTerminal } from "@/features/terminal/hooks/use-restty-terminal";
import { getTerminalsCollection } from "@/features/terminal/terminals-collection";
import { getTerminalTheme } from "@/features/terminal/themes";
import { useConfig } from "@/features/config/hooks/use-config";
import { DEFAULT_CONFIG } from "@pixxl/shared/schema/config";
import type { TerminalMetadata } from "@pixxl/shared";

export const Route = createFileRoute("/app/$projectId/terminal/$terminalId/")({
  component: TerminalPage,
});

function TerminalPage() {
  const { projectId, terminalId } = useParams({
    from: "/app/$projectId/terminal/$terminalId/",
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const terminalsCollection = getTerminalsCollection(projectId);
  const { data: terminals } = useLiveQuery((q) =>
    q.from({ t: terminalsCollection }).where(({ t }) => eq(t.id, terminalId)),
  );
  const { data: config } = useConfig();

  const terminal = terminals?.[0] as TerminalMetadata | undefined;
  const terminalConfig = config?.terminal ?? DEFAULT_CONFIG.terminal;

  const handleRestart = useCallback(() => {
    setSessionKey((key) => key + 1);
  }, []);

  const restty = useResttyTerminal({
    terminalId,
    containerRef,
    themeId: terminalConfig.themeId,
    fontId: terminalConfig.fontId,
    fontSize: terminalConfig.fontSize,
  });

  useEffect(() => {
    void restty.init();

    const controller = new AbortController();
    window.addEventListener("resize", restty.resize, { signal: controller.signal });

    return () => {
      controller.abort();
      restty.dispose();
    };
  }, [sessionKey]);

  useEffect(() => {
    restty.setTheme(terminalConfig.themeId);
  }, [terminalConfig.themeId]);

  useEffect(() => {
    restty.setFont(terminalConfig.fontId);
  }, [terminalConfig.fontId]);

  useEffect(() => {
    restty.setFontSize(terminalConfig.fontSize);
  }, [terminalConfig.fontSize]);

  const theme = getTerminalTheme(terminalConfig.themeId);
  const bgColor = theme?.background ?? "#1e1e2e";

  if (!terminal) {
    return <Navigate to="/app/$projectId/dashboard" params={{ projectId }} />;
  }

  return (
    <div className="h-full flex items-center justify-center p-4 relative" style={{ backgroundColor: bgColor }}>
      <div ref={containerRef} className="h-full w-full overflow-hidden rounded" />
      <div className="absolute top-4 right-4">
        <button
          onClick={handleRestart}
          className="px-3 py-1 text-xs rounded bg-background/80 border shadow"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
