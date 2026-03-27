import { createCollection, BasicIndex } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import { generateId, type CommandMetadata } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";

function getCommandsCollectionInternal(projectId: string) {
  const collection = createCollection(
    queryCollectionOptions({
      queryClient,
      queryKey: ["commands", projectId],
      getKey: (item: CommandMetadata) => item.id,
      queryFn: async () => rpc.command.listCommands({ projectId }) as Promise<CommandMetadata[]>,
      onInsert: async ({ transaction }) => {
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
        for (const mutation of transaction.mutations) {
          await rpc.command.deleteCommand({
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

type CommandsCollection = ReturnType<typeof getCommandsCollectionInternal>;

const cache = new Map<string, CommandsCollection>();

export function getCommandsCollection(projectId: string) {
  const existing = cache.get(projectId);
  if (existing) return existing;

  const collection = getCommandsCollectionInternal(projectId);

  collection.on("status:change", ({ status }) => {
    if (status === "cleaned-up") {
      cache.delete(projectId);
    }
  });

  cache.set(projectId, collection);
  return collection;
}
