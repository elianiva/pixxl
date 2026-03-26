import { useEffect } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/features/agent/components/agent-chat";
import { RiRobot2Line } from "@remixicon/react";
import { getAgentsCollection } from "@/features/agent/agents-collection";
import { selectAgent } from "@/features/agent/store";
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

  useEffect(() => {
    selectAgent(agentId);
    return () => selectAgent(null);
  }, [agentId]);

  if (!activeAgent) return <EmptyState />;

  return <AgentChat projectId={projectId} agentId={agentId} />;
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
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
