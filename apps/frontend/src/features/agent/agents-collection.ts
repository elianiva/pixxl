import { createCollection, BasicIndex } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import { generateId, type AgentMetadata } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";

function getAgentsCollectionInternal(projectId: string) {
  const collection = createCollection(
    queryCollectionOptions({
      queryClient,
      queryKey: ["agents", projectId],
      getKey: (item: AgentMetadata) => item.id,
      queryFn: async () => rpc.agent.listAgents({ projectId }) as Promise<AgentMetadata[]>,
      onInsert: async ({ transaction }) => {
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
        for (const mutation of transaction.mutations) {
          await rpc.agent.updateAgent({
            projectId,
            id: mutation.original.id,
            name: mutation.modified.name,
          });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await rpc.agent.deleteAgent({
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

type AgentsCollection = ReturnType<typeof getAgentsCollectionInternal>;

const cache = new Map<string, AgentsCollection>();

export function getAgentsCollection(projectId: string) {
  const existing = cache.get(projectId);
  if (existing) return existing;

  const collection = getAgentsCollectionInternal(projectId);

  collection.on("status:change", ({ status }) => {
    if (status === "cleaned-up") {
      cache.delete(projectId);
    }
  });

  cache.set(projectId, collection);
  return collection;
}
