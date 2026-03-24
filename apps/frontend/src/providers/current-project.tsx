import { useEffect } from "react";
import { Outlet, useParams } from "@tanstack/react-router";
import { queryClient } from "@/lib/query-client";
import { projectStore, type ProjectState } from "@/lib/project-store";

/**
 * Syncs the current projectId from URL params to the store and invalidates
 * TanStack Query caches when switching projects.
 */
export function CurrentProjectSync() {
  const projectIdFromParams = useParams({ strict: false, select: (p) => p.projectId });
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
