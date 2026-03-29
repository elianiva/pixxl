import { useEffect, useRef, useState, useCallback } from "react";
import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useGhosttyTerminal } from "@/features/terminal/hooks/use-ghostty-terminal";
import { getTerminalsCollection } from "@/features/terminal/terminals-collection";
import { terminalThemes } from "@/features/terminal/themes";
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
  const [isDead, setIsDead] = useState(false);
  const [exitCode, setExitCode] = useState<number | undefined>();
  const [sessionKey, setSessionKey] = useState(0); // Used to force re-initialization

  const terminalsCollection = getTerminalsCollection(projectId);
  const { data: terminals } = useLiveQuery((q) =>
    q.from({ t: terminalsCollection }).where(({ t }) => eq(t.id, terminalId)),
  );
  const { data: config } = useConfig();

  const terminal = terminals?.[0] as TerminalMetadata | undefined;

  // Get settings from global config
  const terminalConfig = config?.terminal ?? DEFAULT_CONFIG.terminal;

  const handleDead = useCallback((code?: number) => {
    setIsDead(true);
    setExitCode(code);
  }, []);

  const handleRestart = useCallback(() => {
    setIsDead(false);
    setExitCode(undefined);
    setSessionKey((k) => k + 1); // Force new ghostty instance
  }, []);

  const ghostty = useGhosttyTerminal({
    terminalId,
    containerRef,
    themeId: terminalConfig.themeId,
    fontId: terminalConfig.fontId,
    fontSize: terminalConfig.fontSize,
    onDead: handleDead,
  });

  // Initialize terminal WebSocket connection - only on mount or session restart
  useEffect(() => {
    void ghostty.init().then(() => console.log("Ghostty initialized"));

    const controller = new AbortController();
    window.addEventListener("resize", ghostty.resize.bind(null), { signal: controller.signal });

    return () => {
      controller.abort();
      ghostty.dispose();
    };
    // Only reconnect on sessionKey change (manual restart), not theme/font changes
  }, [sessionKey]);

  // Apply theme/font changes dynamically without reconnection
  useEffect(() => {
    ghostty.setTheme(terminalConfig.themeId);
  }, [terminalConfig.themeId]);

  useEffect(() => {
    ghostty.setFont(terminalConfig.fontId);
  }, [terminalConfig.fontId]);

  useEffect(() => {
    ghostty.setFontSize(terminalConfig.fontSize);
  }, [terminalConfig.fontSize]);

  // Get theme background color for container styling
  const theme = terminalThemes.find((t) => t.id === terminalConfig.themeId);
  const bgColor = theme?.theme.background ?? "#1e1e2e";

  // Redirect to dashboard if terminal deleted
  if (!terminal) {
    return <Navigate to="/app/$projectId/dashboard" params={{ projectId }} />;
  }

  return (
    <div
      className="h-full flex items-center justify-center p-4 relative"
      style={{ backgroundColor: bgColor }}
    >
      <div ref={containerRef} className="h-full w-full overflow-hidden rounded" />
      {isDead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border rounded-lg p-6 shadow-lg max-w-sm text-center space-y-4">
            <p className="text-muted-foreground">
              Session ended{exitCode !== undefined ? ` (exit code ${exitCode})` : ""}
            </p>
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
