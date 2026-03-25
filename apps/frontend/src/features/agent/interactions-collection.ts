import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import { type PiSessionEntry } from "@pixxl/shared";
import { queryClient } from "@/lib/query-client";

// Maps backend PiSessionEntry to frontend AgentInteraction
export interface AgentInteraction {
  id: string;
  projectId: string;
  agentId: string;
  entry: PiSessionEntry;
  order: number;
}

function toInteraction(
  projectId: string,
  agentId: string,
  entry: PiSessionEntry,
  order: number,
): AgentInteraction {
  return {
    id: `${projectId}:${agentId}:${entry.id}`,
    projectId,
    agentId,
    entry,
    order,
  };
}

function getInteractionsCollectionInternal(projectId: string, agentId: string) {
  return createCollection(
    queryCollectionOptions({
      queryClient,
      queryKey: ["agent-interactions", projectId, agentId],
      getKey: (item: AgentInteraction) => item.id,
      queryFn: async () => {
        const history = await rpc.agent.getAgentHistory({ projectId, agentId });
        if (!history) return [];

        return history.entries.map((entry, order) =>
          toInteraction(projectId, agentId, entry, order),
        );
      },
    }),
  );
}

type InteractionsCollection = ReturnType<typeof getInteractionsCollectionInternal>;

const cache = new Map<string, InteractionsCollection>();

export function getInteractionsCollection(projectId: string, agentId: string) {
  const key = `${projectId}:${agentId}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const collection = getInteractionsCollectionInternal(projectId, agentId);

  collection.on("status:change", ({ status }) => {
    if (status === "cleaned-up") {
      cache.delete(key);
    }
  });

  cache.set(key, collection);
  return collection;
}

// Send message and stream response
// Backend handles persistence (appending to pi session file)
export async function sendAgentMessage(
  projectId: string,
  agentId: string,
  text: string,
  mode: "immediate" | "steer" | "followUp" = "immediate",
) {
  return rpc.agent.promptAgent({
    projectId,
    agentId,
    text,
    mode,
  });
}
