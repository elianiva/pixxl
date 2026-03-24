import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import type { TerminalMetadata } from "@pixxl/shared";
import { generateId } from "@/lib/utils";
import { queryClient } from "@/lib/query-client";
import { projectStore } from "@/lib/project-store";

export const terminalsCollection = createCollection(
  queryCollectionOptions({
    queryClient,
    queryKey: () => ["terminals", projectStore.state.currentProjectId],
    getKey: (item: TerminalMetadata) => item.id,
    queryFn: async () => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return [];
      const result = await rpc.terminal.listTerminals({ projectId });
      return [...result];
    },
    enabled: Boolean(projectStore.state.currentProjectId),

    onInsert: async ({ transaction }) => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return;

      for (const mutation of transaction.mutations) {
        const modified = mutation.modified;
        if (!modified.name) continue;

        await rpc.terminal.createTerminal({
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
        await rpc.terminal.updateTerminal({
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
        await rpc.terminal.deleteTerminal({
          projectId,
          id: mutation.original.id,
        });
      }
    },
  }),
);
