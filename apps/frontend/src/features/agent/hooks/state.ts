import { useStore } from "@tanstack/react-store";
import { agentStore } from "../store";
import { useAgentEntries, useProjectId } from "./use-agent-entries";

export function useActiveAgentId(): string | null {
  return useStore(agentStore, (state) => state.activeAgentId);
}

export function useIsStreaming(agentId?: string) {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useProjectId();
  const { status } = useAgentEntries(targetAgentId, projectId);
  return status === "streaming";
}

export function useIsConnecting(agentId?: string) {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useProjectId();
  const { entries } = useAgentEntries(targetAgentId, projectId);
  // Connecting when no entries yet but we have an agent
  return entries.length === 0 && !!targetAgentId;
}
