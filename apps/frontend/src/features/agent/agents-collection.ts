import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import { generateId, type AgentMetadata } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";
import { projectStore } from "@/lib/project-store";

export const agentsCollection = createCollection(
  queryCollectionOptions({
    queryClient,
    queryKey: () => ["agents", projectStore.state.currentProjectId],
    getKey: (item: AgentMetadata) => item.id,
    queryFn: async () => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return [];
      const result = await rpc.agent.listAgents({ projectId });
      return [...result];
    },
    onInsert: async ({ transaction }) => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return;

      for (const mutation of transaction.mutations) {
        const modified = mutation.modified;
        if (!modified.name) continue;

        await rpc.agent.createAgent({
          id: generateId(),
          projectId,
          name: modified.name,
        });
      }
    },
    onUpdate: async ({ transaction }) => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return;

      for (const mutation of transaction.mutations) {
        await rpc.agent.updateAgent({
          projectId,
          id: mutation.original.id,
          name: mutation.modified.name,
        });
      }
    },
    onDelete: async ({ transaction }) => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return;

      for (const mutation of transaction.mutations) {
        await rpc.agent.deleteAgent({
          projectId,
          id: mutation.original.id,
        });
      }
    },
  }),
);
