import { Outlet, createFileRoute } from "@tanstack/react-router";
import { projectStore } from "@/lib/project-store";

export const Route = createFileRoute("/app/$projectId")({
  component: RouteComponent,
  // Sync projectId from params to store for legacy usage (agent store, etc.)
  onEnter: ({ params }) => {
    projectStore.setState((prev) => ({
      ...prev,
      currentProjectId: params.projectId,
    }));
  },
});

function RouteComponent() {
  return <Outlet />;
}
