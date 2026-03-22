import { useEffect, useRef } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useGhosttyTerminal } from "@/features/terminal/hooks/use-ghostty-terminal";

export const Route = createFileRoute("/app/$projectId/terminal/$terminalId/")({
  component: TerminalPage,
});

function TerminalPage() {
  const { terminalId } = useParams({ from: "/app/$projectId/terminal/$terminalId/" });
  const containerRef = useRef<HTMLDivElement>(null);

  const { init, dispose, resize } = useGhosttyTerminal({
    terminalId,
    containerRef,
  });

  useEffect(() => {
    void init();

    // Handle window resize
    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      dispose();
    };
  }, [init, dispose, resize]);

  return (
    <div className="h-full flex flex-col bg-[#1e1e2e]">
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
