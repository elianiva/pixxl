import { useCallback } from "react";
import { useStore } from "@tanstack/react-store";
import {
  agentStore,
  selectSession,
  createSession,
  closeSession,
  sendPrompt,
  abortStreaming,
  clearError,
  type SessionState,
} from "./store";

/**
 * Get all sessions from the store
 */
export function useAgentSessions() {
  return useStore(agentStore, (state) => Object.values(state.sessions));
}

/**
 * Get a specific session by ID
 */
export function useSession(sessionId: string | null): SessionState | null {
  return useStore(agentStore, (state) => (sessionId ? (state.sessions[sessionId] ?? null) : null));
}

/**
 * Get the currently active session
 */
export function useActiveSession(): SessionState | null {
  return useStore(agentStore, (state) =>
    state.activeSessionId ? (state.sessions[state.activeSessionId] ?? null) : null,
  );
}

/**
 * Get the active session ID
 */
export function useActiveSessionId(): string | null {
  return useStore(agentStore, (state) => state.activeSessionId);
}

/**
 * Get the streaming message (last message if streaming)
 */
export function useStreamingMessage(): { content: string; isStreaming: boolean } | null {
  const session = useActiveSession();
  if (!session) return null;

  const lastMessage = session.messages.at(-1);
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
 * Check if a session is currently streaming
 */
export function useIsStreaming(sessionId?: string) {
  const activeSessionId = useActiveSessionId();
  const targetId = sessionId ?? activeSessionId;

  return useStore(agentStore, (state) =>
    targetId ? (state.sessions[targetId]?.isStreaming ?? false) : false,
  );
}

/**
 * Get the current tool call being executed
 */
export function useCurrentToolCall(sessionId?: string) {
  const activeSessionId = useActiveSessionId();
  const targetId = sessionId ?? activeSessionId;

  return useStore(agentStore, (state) =>
    targetId ? (state.sessions[targetId]?.currentToolCall ?? null) : null,
  );
}

/**
 * Get all tool calls for a session
 */
export function useToolCalls(sessionId?: string) {
  const activeSessionId = useActiveSessionId();
  const targetId = sessionId ?? activeSessionId;

  return useStore(agentStore, (state) =>
    targetId ? (state.sessions[targetId]?.toolCalls ?? []) : [],
  );
}

/**
 * Get messages for a session
 */
export function useMessages(sessionId?: string) {
  const activeSessionId = useActiveSessionId();
  const targetId = sessionId ?? activeSessionId;

  return useStore(agentStore, (state) =>
    targetId ? (state.sessions[targetId]?.messages ?? []) : [],
  );
}

/**
 * Hook that provides agent actions with bound session ID
 */
export function useAgentActions() {
  const activeSessionId = useActiveSessionId();

  const handleSelectSession = useCallback((sessionId: string | null) => {
    selectSession(sessionId);
  }, []);

  const handleCreateSession = useCallback(
    async (input: {
      name: string;
      model?: string;
      thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
    }) => {
      return createSession(input);
    },
    [],
  );

  const handleCloseSession = useCallback(async (sessionId: string) => {
    return closeSession(sessionId);
  }, []);

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
    selectSession: handleSelectSession,
    createSession: handleCreateSession,
    closeSession: handleCloseSession,
    sendPrompt: handleSendPrompt,
    abort: handleAbort,
    clearError: handleClearError,
    activeSessionId,
  };
}
