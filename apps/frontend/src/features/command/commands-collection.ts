import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import { generateId, type CommandMetadata } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";
import { projectStore } from "@/lib/project-store";

export const commandsCollection = createCollection(
  queryCollectionOptions({
    queryClient,
    queryKey: () => ["commands", projectStore.state.currentProjectId],
    getKey: (item: CommandMetadata) => item.id,
    queryFn: async () => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return [];
      const result = await rpc.command.listCommands({ projectId });
      return [...result];
    },
    onInsert: async ({ transaction }) => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return;

      for (const mutation of transaction.mutations) {
        const modified = mutation.modified;
        if (!modified.name || !modified.command) continue;

        await rpc.command.createCommand({
          id: generateId(),
          projectId,
          name: modified.name,
          command: modified.command,
          description: modified.description ?? "",
        });
      }
    },
    onDelete: async ({ transaction }) => {
      const projectId = projectStore.state.currentProjectId;
      if (!projectId) return;

      for (const mutation of transaction.mutations) {
        await rpc.command.deleteCommand({
          projectId,
          id: mutation.original.id,
        });
      }
    },
  }),
);
