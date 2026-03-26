import { createCollection, BasicIndex } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import { generateId } from "@/lib/utils";
import type { TerminalMetadata } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";

function getTerminalsCollectionInternal(projectId: string) {
  const collection = createCollection(
    queryCollectionOptions({
      queryClient,
      queryKey: ["terminals", projectId],
      getKey: (item: TerminalMetadata) => item.id,
      queryFn: async () => {
        const result = await rpc.terminal.listTerminals({ projectId });
        return [...result];
      },
      onInsert: async ({ transaction }) => {
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
        for (const mutation of transaction.mutations) {
          await rpc.terminal.updateTerminal({
            projectId,
            id: mutation.original.id,
            name: mutation.modified.name,
          });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await rpc.terminal.deleteTerminal({
            projectId,
            id: mutation.original.id,
          });
        }
      },
    }),
  );

  collection.createIndex((item) => item.updatedAt, { indexType: BasicIndex });

  return collection;
}

type TerminalsCollection = ReturnType<typeof getTerminalsCollectionInternal>;

const cache = new Map<string, TerminalsCollection>();

export function getTerminalsCollection(projectId: string) {
  const existing = cache.get(projectId);
  if (existing) return existing;

  const collection = getTerminalsCollectionInternal(projectId);

  collection.on("status:change", ({ status }) => {
    if (status === "cleaned-up") {
      cache.delete(projectId);
    }
  });

  cache.set(projectId, collection);
  return collection;
}
