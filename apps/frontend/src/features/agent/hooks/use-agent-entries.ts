import { useQuery, experimental_streamedQuery as streamedQuery } from "@tanstack/react-query";
import { projectStore } from "@/lib/project-store";
import { rpc } from "@/lib/rpc";
import type { AgentSnapshot, PiAgentEvent, PiSessionEntry } from "@pixxl/shared";
import { useStore } from "@tanstack/react-store";

export interface AgentEntriesState {
  entries: readonly PiSessionEntry[];
  status: "idle" | "streaming" | "error";
}

function reduceAgentEntries(
  state: AgentEntriesState,
  item: AgentSnapshot | PiAgentEvent,
): AgentEntriesState {
  // Snapshot replaces everything
  if (item.type === "snapshot") {
    return {
      entries: item.entries,
      status: item.status === "error" ? "error" : item.status,
    };
  }

  // Events just update status - entries are already persisted via snapshot
  switch (item.type) {
    case "agent_start":
      return { ...state, status: "streaming" };
    case "agent_end":
      return { ...state, status: "idle" };
    default:
      return state;
  }
}

export function useAgentEntries(agentId: string | null, projectId: string | null) {
  const { data: state } = useQuery({
    queryKey: ["agent-entries", projectId, agentId],
    queryFn: streamedQuery({
      streamFn: async () => {
        if (!agentId || !projectId) throw new Error("Missing agentId or projectId");
        return rpc.agent.subscribeAgent({ projectId, agentId });
      },
      reducer: reduceAgentEntries,
      initialValue: { entries: [], status: "idle" } as AgentEntriesState,
    }),
    enabled: !!agentId && !!projectId,
    staleTime: Infinity,
  });

  return state ?? { entries: [], status: "idle" as const };
}

export function useProjectId(): string | null {
  return useStore(projectStore, (state) => state.currentProjectId);
}
