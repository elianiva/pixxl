import { useQuery, experimental_streamedQuery as streamedQuery } from "@tanstack/react-query";
import { projectStore } from "@/lib/project-store";
import { rpc } from "@/lib/rpc";
import type { AgentSnapshot, PiAgentEvent } from "@pixxl/shared";
import { useStore } from "@tanstack/react-store";
import type { PiSessionEntry } from "@pixxl/shared";

export interface AgentStreamState {
  entries: readonly PiSessionEntry[];
  status: "idle" | "streaming" | "error";
  error: string | null;
}

/** Counter for generating unique streaming entry IDs */
let streamingEntryCounter = 0;

function reduceStreamItem(
  state: AgentStreamState,
  item: AgentSnapshot | PiAgentEvent,
): AgentStreamState {
  // Snapshot replaces everything, but preserve pending entries that don't exist in snapshot yet
  if (item.type === "snapshot") {
    streamingEntryCounter = 0;
    // Get real message parentIds (to match pending streaming entries)
    const realParentIds = new Set(
      item.entries
        .filter((e) => e.type === "message")
        .map((e) => e.parentId)
        .filter((p): p is string => p !== null),
    );
    // Keep pending entries that don't have a matching real message yet
    const pendingToKeep = state.entries.filter((e) => {
      if (!e.id.startsWith("pending:")) return false;
      // Remove pending if its parent now has a real message child
      return !realParentIds.has(e.parentId ?? "__null__");
    });
    return {
      entries: [...item.entries, ...pendingToKeep] as PiSessionEntry[],
      status: item.status,
      error: item.status === "error" ? "Agent error" : null,
    };
  }

  // Events update status and accumulate streaming content
  switch (item.type) {
    case "agent_start":
      return { ...state, status: "streaming" };
    case "agent_end":
      return { ...state, status: "idle" };
    case "message_start": {
      const msg = item.message as { role?: string } | undefined;
      // Only create streaming entry for assistant messages, not user/tool messages
      if (msg?.role !== "assistant") {
        return { ...state, status: "streaming" };
      }
      // Remove any existing streaming entry (shouldn't happen, but safety)
      const cleanedEntries = state.entries.filter((e) => !e.id.startsWith("streaming:"));
      const entry = {
        id: `streaming:${++streamingEntryCounter}`,
        type: "message" as const,
        parentId: null,
        timestamp: new Date().toISOString(),
        message: item.message,
      };
      return {
        ...state,
        entries: [...cleanedEntries, entry as PiSessionEntry],
        status: "streaming",
      };
    }
    case "message_update": {
      // Only update assistant messages
      const msg = item.message as { role?: string } | undefined;
      if (msg?.role !== "assistant") return state;
      // Update the last streaming entry with new content
      const entries = [...state.entries];
      const lastIdx = entries.findLastIndex((e) => e.id.startsWith("streaming:"));
      if (lastIdx !== -1) {
        entries[lastIdx] = { ...entries[lastIdx], message: item.message } as PiSessionEntry;
      }
      return { ...state, entries };
    }
    case "message_end": {
      // Only convert assistant message streaming entries
      const msg = item.message as { role?: string } | undefined;
      if (msg?.role !== "assistant") return state;
      // Convert streaming entry to complete by renaming the ID
      const entries = state.entries.map((e) =>
        e.id.startsWith("streaming:") ? { ...e, id: `pending:${e.id.slice(10)}` } : e,
      ) as PiSessionEntry[];
      return { ...state, entries };
    }
    default:
      return state;
  }
}

export function useAgentSubscription(agentId: string | null, projectId: string | null) {
  const { data: streamState } = useQuery({
    queryKey: ["agent-stream", projectId, agentId],
    queryFn: streamedQuery({
      streamFn: async () => {
        if (!agentId || !projectId) throw new Error("Missing agentId or projectId");
        return rpc.agent.subscribeAgent({ projectId, agentId });
      },
      reducer: reduceStreamItem,
      initialValue: { entries: [], status: "idle", error: null } as AgentStreamState,
    }),
    enabled: !!agentId && !!projectId,
    staleTime: Infinity,
  });

  return streamState ?? null;
}

export function useProjectId(): string | null {
  return useStore(projectStore, (state) => state.currentProjectId);
}
