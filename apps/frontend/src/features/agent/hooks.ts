import { useCallback } from "react";
import { useStore } from "@tanstack/react-store";
import {
  agentStore,
  selectAgent,
  createAgent,
  deleteAgent,
  sendPrompt,
  abortStreaming,
  clearError,
  type AgentStateItem,
} from "./store";

/**
 * Get all agents from the store
 */
export function useAgentSessions() {
  return useStore(agentStore, (state) => Object.values(state.agents));
}

/**
 * Get a specific agent by ID
 */
export function useSession(agentId: string | null): AgentStateItem | null {
  return useStore(agentStore, (state) => (agentId ? (state.agents[agentId] ?? null) : null));
}

/**
 * Get the currently active agent
 */
export function useActiveSession(): AgentStateItem | null {
  return useStore(agentStore, (state) =>
    state.activeAgentId ? (state.agents[state.activeAgentId] ?? null) : null,
  );
}

/**
 * Get the active agent ID
 */
export function useActiveSessionId(): string | null {
  return useStore(agentStore, (state) => state.activeAgentId);
}

/**
 * Get the streaming message (last message if streaming)
 */
export function useStreamingMessage(): { content: string; isStreaming: boolean } | null {
  const agent = useActiveSession();
  if (!agent) return null;

  const lastMessage = agent.messages.at(-1);
  if (lastMessage?.isStreaming) {
    return { content: lastMessage.content, isStreaming: true };
  }

  return null;
}

/**
 * Get the current connection status
 */
export function useAgentConnectionStatus() {
  return useStore(agentStore, (state) => state.connectionStatus);
}

/**
 * Get the current error, if any
 */
export function useAgentError() {
  return useStore(agentStore, (state) => state.error);
}

/**
 * Check if an agent is currently streaming
 */
export function useIsStreaming(agentId?: string) {
  const activeAgentId = useActiveSessionId();
  const targetId = agentId ?? activeAgentId;

  return useStore(agentStore, (state) =>
    targetId ? (state.agents[targetId]?.isStreaming ?? false) : false,
  );
}

/**
 * Get the current tool call being executed
 */
export function useCurrentToolCall(agentId?: string) {
  const activeAgentId = useActiveSessionId();
  const targetId = agentId ?? activeAgentId;

  return useStore(agentStore, (state) =>
    targetId ? (state.agents[targetId]?.currentToolCall ?? null) : null,
  );
}

/**
 * Get all tool calls for an agent
 */
export function useToolCalls(agentId?: string) {
  const activeAgentId = useActiveSessionId();
  const targetId = agentId ?? activeAgentId;

  return useStore(agentStore, (state) =>
    targetId ? (state.agents[targetId]?.toolCalls ?? []) : [],
  );
}

/**
 * Get messages for an agent
 */
export function useMessages(agentId?: string) {
  const activeAgentId = useActiveSessionId();
  const targetId = agentId ?? activeAgentId;

  return useStore(agentStore, (state) =>
    targetId ? (state.agents[targetId]?.messages ?? []) : [],
  );
}

/**
 * Hook that provides agent actions with bound agent ID
 */
export function useAgentActions(projectId: string) {
  const activeAgentId = useActiveSessionId();

  const handleSelectAgent = useCallback((agentId: string | null) => {
    selectAgent(agentId);
  }, []);

  const handleCreateAgent = useCallback(
    async (input: {
      name: string;
      model?: string;
      thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    }) => {
      return createAgent({ ...input, projectId });
    },
    [projectId],
  );

  const handleDeleteAgent = useCallback(
    async (agentId: string) => {
      return deleteAgent(agentId, projectId);
    },
    [projectId],
  );

  const handleSendPrompt = useCallback(async (text: string) => {
    return sendPrompt(text);
  }, []);

  const handleAbort = useCallback(() => {
    abortStreaming();
  }, []);

  const handleClearError = useCallback(() => {
    clearError();
  }, []);

  return {
    selectAgent: handleSelectAgent,
    createAgent: handleCreateAgent,
    deleteAgent: handleDeleteAgent,
    sendPrompt: handleSendPrompt,
    abort: handleAbort,
    clearError: handleClearError,
    activeAgentId,
  };
}
