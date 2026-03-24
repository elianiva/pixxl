import { useEffect } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { queryClient } from "@/lib/query-client";
import { projectStore, type ProjectState } from "@/lib/project-store";

export const Route = createFileRoute("/app/$projectId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectId: projectIdFromParams } = Route.useParams();
  const currentProjectId = projectStore.state.currentProjectId;

  useEffect(() => {
    if (projectIdFromParams && projectIdFromParams !== currentProjectId) {
      // Invalidate all project-scoped queries when switching projects
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      void queryClient.invalidateQueries({ queryKey: ["terminals"] });
      void queryClient.invalidateQueries({ queryKey: ["commands"] });

      projectStore.setState((prev: ProjectState) => ({
        ...prev,
        currentProjectId: projectIdFromParams,
      }));
    }
  }, [projectIdFromParams, currentProjectId]);

  return <Outlet />;
}
