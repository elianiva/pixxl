import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$projectId/agent/")({
  component: AgentIndex,
});

function AgentIndex() {
  const { projectId } = Route.useParams();
  return <Navigate to="/app/$projectId/dashboard" params={{ projectId }} />;
}
