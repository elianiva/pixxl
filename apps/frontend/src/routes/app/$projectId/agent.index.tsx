import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/features/agent/pages/AgentsPage";

export const Route = createFileRoute("/app/$projectId/agent/")({
  component: AgentIndex,
});

function AgentIndex() {
  return <AgentsPage />;
}
