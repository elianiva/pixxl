import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import type { ProjectMetadata } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";

export const projectsCollection = createCollection(
  queryCollectionOptions({
    queryClient,
    queryKey: ["projects"],
    getKey: (item: ProjectMetadata) => item.id,
    queryFn: () => rpc.project.listProjects({}) as Promise<ProjectMetadata[]>,
    onInsert: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const modified = mutation.modified;
        if (!modified.name) continue;

        await rpc.project.createProject({ id: modified.id, name: modified.name });
      }
    },
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        await rpc.project.deleteProject({ id: mutation.original.id });
      }
    },
  }),
);
