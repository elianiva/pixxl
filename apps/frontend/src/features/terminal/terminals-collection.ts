import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { getDefaultStore } from "jotai/vanilla";
import { rpc } from "@/lib/rpc";
import type { TerminalMetadata } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";
import { currentProjectIdAtom } from "@/providers/current-project";

export const store = getDefaultStore();

export const terminalsCollection = createCollection(
  queryCollectionOptions({
    queryClient,
    queryKey: () => ["terminals", store.get(currentProjectIdAtom)],
    getKey: (item: TerminalMetadata) => item.id,
    queryFn: async () => {
      const projectId = store.get(currentProjectIdAtom);
      if (!projectId) return [];

      const result = await rpc.terminal.listTerminals({ projectId });
      return [...result];
    },

    onInsert: async ({ transaction }) => {
      const projectId = store.get(currentProjectIdAtom);
      if (!projectId) return;

      for (const mutation of transaction.mutations) {
        const modified = mutation.modified;
        if (!modified.name) continue;

        await rpc.terminal.createTerminal({ projectId, name: modified.name });
      }
    },

    onUpdate: async ({ transaction }) => {
      const projectId = store.get(currentProjectIdAtom);
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
      const projectId = store.get(currentProjectIdAtom);
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
