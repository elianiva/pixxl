import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/features/agent/pages/AgentsPage";

export const Route = createFileRoute("/app/$projectId/agent/$sessionId")({
  component: AgentSessionRoute,
  beforeLoad: ({ params }) => {
    // Validate sessionId param
    return { sessionId: params.sessionId };
  },
});

function AgentSessionRoute() {
  const { sessionId } = Route.useParams();
  return <AgentsPage initialSessionId={sessionId} />;
}
