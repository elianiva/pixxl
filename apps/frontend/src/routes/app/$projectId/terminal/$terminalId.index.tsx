import { useEffect, useRef } from "react";
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

  const terminalsCollection = getTerminalsCollection(projectId);
  const { data: terminals } = useLiveQuery((q) =>
    q.from({ t: terminalsCollection }).where(({ t }) => eq(t.id, terminalId)),
  );

  const terminal = terminals?.[0] as TerminalMetadata | undefined;

  const ghostty = useGhosttyTerminal({
    terminalId,
    containerRef,
    themeId: terminal?.themeId ?? "catppuccin-mocha",
    fontId: terminal?.fontId ?? "jetbrains-mono",
    fontSize: terminal?.fontSize ?? 14,
  });

  useEffect(() => {
    void ghostty.init().then(() => console.log("Ghostty initialized"));

    const controller = new AbortController();
    window.addEventListener("resize", ghostty.resize.bind(null), { signal: controller.signal });

    return () => {
      controller.abort();
      ghostty.dispose();
    };
  }, [terminal?.themeId, terminal?.fontId, terminal?.fontSize]);

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
      className="h-full flex items-center justify-center p-4"
      style={{ backgroundColor: bgColor }}
    >
      <div ref={containerRef} className="h-full w-full overflow-hidden rounded" />
    </div>
  );
}
