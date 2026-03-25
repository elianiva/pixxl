import { useEffect } from "react";
import { useStore } from "@tanstack/react-store";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/features/agent/components/agent-chat";
import { ConnectionStatus } from "@/features/agent/components/connection-status";
import { Button } from "@/components/ui/button";
import { RiRobot2Line } from "@remixicon/react";
import { getAgentsCollection } from "@/features/agent/agents-collection";
import { agentStore, selectAgent } from "@/features/agent/store";
import type { AgentMetadata } from "@pixxl/shared";

export const Route = createFileRoute("/app/$projectId/agent/$agentId")({
  component: AgentRoute,
});

function AgentRoute() {
  const { projectId, agentId } = Route.useParams();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents = useLiveQuery(projectId ? getAgentsCollection(projectId) : (null as any));
  const activeAgent =
    ((agents.data as AgentMetadata[]) ?? []).find((agent) => agent.id === agentId) ?? null;
  const connectionStatus = useStore(agentStore, (state) => state.connectionStatus);

  useEffect(() => {
    selectAgent(agentId);

    return () => {
      selectAgent(null);
    };
  }, [agentId]);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-w-0">
        <AgentHeader agentName={activeAgent?.name} connectionStatus={connectionStatus} />
        <div className="flex-1 overflow-hidden">
          {activeAgent ? <AgentChat projectId={projectId} agentId={agentId} /> : <EmptyState />}
        </div>
      </div>
    </div>
  );
}

interface AgentHeaderProps {
  agentName?: string;
  connectionStatus: "idle" | "connecting" | "streaming" | "error";
}

function AgentHeader({ agentName, connectionStatus }: AgentHeaderProps) {
  const isStreaming = connectionStatus === "streaming";

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <RiRobot2Line className="size-5 text-muted-foreground" />
        <h2 className="font-semibold">{agentName || "No agent selected"}</h2>
      </div>
      <div className="flex items-center gap-2">
        <ConnectionStatus status={connectionStatus} />
        {isStreaming && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Abort streaming is handled in chat input controls
            }}
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="rounded-full bg-muted p-4">
        <RiRobot2Line className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No agent selected</h3>
      <p className="text-sm text-muted-foreground">
        Create a new agent from the sidebar to start chatting
      </p>
    </div>
  );
}
