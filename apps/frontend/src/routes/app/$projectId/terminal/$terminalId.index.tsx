import { useEffect, useRef, useState, useCallback } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useGhosttyTerminal } from "@/features/terminal/hooks/use-ghostty-terminal";
import { getTerminalsCollection } from "@/features/terminal/terminals-collection";
import { terminalThemes } from "@/features/terminal/themes";
import { Skeleton } from "@/components/ui/skeleton";
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

  const terminal = terminals?.[0] as TerminalMetadata | undefined;

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
    themeId: terminal?.themeId ?? "catppuccin-mocha",
    fontId: terminal?.fontId ?? "jetbrains-mono",
    fontSize: terminal?.fontSize ?? 14,
    onDead: handleDead,
  });

  useEffect(() => {
    void ghostty.init().then(() => console.log("Ghostty initialized"));

    const controller = new AbortController();
    window.addEventListener("resize", ghostty.resize.bind(null), { signal: controller.signal });

    return () => {
      controller.abort();
      ghostty.dispose();
    };
    // sessionKey forces re-initialization when restarting dead session
  }, [terminal?.themeId, terminal?.fontId, terminal?.fontSize, sessionKey]);

  // Get theme background color for container styling
  const theme = terminalThemes.find((t) => t.id === terminal?.themeId);
  const bgColor = theme?.theme.background ?? "#1e1e2e";

  // Show loading state while terminal data is loading
  if (!terminal) {
    return (
      <div className="h-full flex flex-col bg-[#1e1e2e]">
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
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
