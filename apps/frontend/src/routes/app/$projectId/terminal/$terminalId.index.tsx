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
  const [isDead, setIsDead] = useState(false);

  const terminalsCollection = getTerminalsCollection(projectId);
  const { data: terminals } = useLiveQuery((q) =>
    q.from({ t: terminalsCollection }).where(({ t }) => eq(t.id, terminalId)),
  );
  const { data: config } = useConfig();

  const terminal = terminals?.[0] as TerminalMetadata | undefined;
  const terminalConfig = config?.terminal ?? DEFAULT_CONFIG.terminal;

  const handleRestart = useCallback(() => {
    setIsDead(false);
    setSessionKey((key) => key + 1);
  }, []);

  const restty = useResttyTerminal({
    projectId,
    terminalId,
    containerRef,
    themeId: terminalConfig.themeId,
    fontId: terminalConfig.fontId,
    fontSize: terminalConfig.fontSize,
    onDead: () => setIsDead(true),
  });

  useEffect(() => {
    setIsDead(false);
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

      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="bg-background border rounded-lg shadow-lg p-6 text-center max-w-sm">
            <p className="text-sm text-muted-foreground mb-4">The terminal process has exited.</p>
            <button
              onClick={handleRestart}
              className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Restart Terminal
            </button>
          </div>
        </div>
      )}

      {!isDead && (
        <div className="absolute top-4 right-4">
          <button
            onClick={handleRestart}
            className="px-3 py-1 text-xs rounded bg-background/80 border shadow"
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}
