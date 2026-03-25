import { useEffect } from "react";
import { useStore } from "@tanstack/react-store";
import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/features/agent/components/agent-chat";
import { ConnectionStatus } from "@/features/agent/components/connection-status";
import { Button } from "@/components/ui/button";
import { RiRobot2Line } from "@remixicon/react";
import { agentStore, selectAgent, initializeAgent } from "@/features/agent/store";
import { rpc } from "@/lib/rpc";

export const Route = createFileRoute("/app/$projectId/agent/$agentId")({
  component: AgentRoute,
});

function AgentRoute() {
  const { projectId, agentId } = Route.useParams();

  const activeAgent = useStore(agentStore, (state) =>
    state.activeAgentId ? (state.agents[state.activeAgentId] ?? null) : null,
  );
  const connectionStatus = useStore(agentStore, (state) => state.connectionStatus);

  // Load agent data on mount
  useEffect(() => {
    if (!projectId || !agentId) return;

    // Load agent metadata from server
    rpc.agent
      .getAgent({ projectId, id: agentId })
      .then((agent) => {
        if (agent) {
          // Initialize agent in store
          void initializeAgent(agent, projectId);
          selectAgent(agentId);
        }
      })
      .catch((error) => {
        console.error("[AgentRoute] Failed to load agent:", error);
      });

    return () => {
      // Reset active agent on unmount
      agentStore.setState((state) => ({
        ...state,
        activeAgentId: null,
      }));
    };
  }, [projectId, agentId]);

  // Select agent from URL
  useEffect(() => {
    if (agentId) {
      selectAgent(agentId);
    }
  }, [agentId]);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-w-0">
        <AgentHeader agentName={activeAgent?.name} connectionStatus={connectionStatus} />
        <div className="flex-1 overflow-hidden">{activeAgent ? <AgentChat /> : <EmptyState />}</div>
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
              // Abort streaming - this will be handled by AgentChat
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
