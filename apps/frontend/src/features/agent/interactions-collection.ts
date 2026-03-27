import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import type { AgentHistory } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";

type HistoryEntry = AgentHistory["entries"][number];

export interface AgentInteraction {
  id: string;
  projectId: string;
  agentId: string;
  entry: HistoryEntry;
  order: number;
}

function createInteractionsCollection(projectId: string, agentId: string) {
  return createCollection(
    queryCollectionOptions({
      queryClient,
      queryKey: ["agent-interactions", projectId, agentId],
      getKey: (item: AgentInteraction) => item.id,
      queryFn: async () => {
        const history = await rpc.agent.getAgentHistory({
          projectId,
          agentId,
        });

        return (
          history?.entries.map(
            (entry, order) =>
              ({
                id: entry.id,
                projectId,
                agentId,
                entry,
                order,
              }) satisfies AgentInteraction,
          ) ?? []
        );
      },
    }),
  );
}

const cache = new Map<string, ReturnType<typeof createInteractionsCollection>>();

export function getInteractionsCollection(projectId: string, agentId: string) {
  const key = `${projectId}:${agentId}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const collection = createInteractionsCollection(projectId, agentId);

  collection.on("status:change", ({ status }) => {
    if (status === "cleaned-up") {
      cache.delete(key);
    }
  });

  cache.set(key, collection);
  return collection;
}
