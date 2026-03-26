import { useEffect } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AgentChat } from "@/features/agent/components/agent-chat";
import { getAgentsCollection } from "@/features/agent/agents-collection";
import { selectAgent } from "@/features/agent/store";

export const Route = createFileRoute("/app/$projectId/agent/$agentId")({
  component: AgentRoute,
});

function AgentRoute() {
  const { projectId, agentId } = Route.useParams();

  const { data: agent } = useLiveQuery((q) =>
    q.from({ agent: getAgentsCollection(projectId) }).where(({ agent }) => eq(agent.id, agentId)),
  );

  useEffect(() => {
    selectAgent(agentId);
    return () => selectAgent(null);
  }, [agentId]);

  if (!agent) return <Navigate to="/app/$projectId/dashboard" params={{ projectId }} />;

  return <AgentChat projectId={projectId} agentId={agentId} />;
}
