import { useStore } from "@tanstack/react-store";
import { agentStore } from "../store";
import { useAgentSubscription } from "./subscription";
import { useProjectId } from "./subscription";

export function useActiveAgentId(): string | null {
  return useStore(agentStore, (state) => state.activeAgentId);
}

export function useIsStreaming(agentId?: string) {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useProjectId();
  const streamState = useAgentSubscription(targetAgentId, projectId);
  return streamState?.status === "streaming";
}

export function useIsConnecting(agentId?: string) {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useProjectId();
  const streamState = useAgentSubscription(targetAgentId, projectId);
  // Connecting when query is pending/fetching but no data yet
  return !streamState && !!targetAgentId;
}
