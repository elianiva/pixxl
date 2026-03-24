import { Store } from "@tanstack/react-store";
import type { AgentSession, AgentEvent } from "@pixxl/shared";
import { rpc } from "@/lib/rpc";
import { projectStore } from "@/lib/project-store";
import { queryClient } from "@/lib/query-client";

/**
 * Message in a chat conversation
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  reasoning?: string;
}

/**
 * Tool call during agent execution
 */
export interface ToolCall {
  id: string;
  name: string;
  params: unknown;
  status: "running" | "complete" | "error";
  output?: string;
  error?: string;
}

/**
 * Runtime session state (messages, tools, streaming status)
 */
export interface SessionState {
  messages: Message[];
  isStreaming: boolean;
  currentToolCall?: ToolCall;
  toolCalls: ToolCall[];
}

/**
 * Full session including metadata and runtime state
 */
export interface AgentSessionState extends AgentSession, SessionState {}

/**
 * Agent store state
 */
export interface AgentState {
  sessions: Record<string, AgentSessionState>;
  activeSessionId: string | null;
  connectionStatus: "idle" | "connecting" | "streaming" | "error";
  error: string | null;
}

const initialState: AgentState = {
  sessions: {},
  activeSessionId: null,
  connectionStatus: "idle",
  error: null,
};

export const agentStore = new Store<AgentState>(initialState);

/**
 * Convert AgentEvent to session state update
 */
function handleAgentEvent(sessionId: string, event: AgentEvent): Partial<SessionState> | null {
  switch (event.type) {
    case "message_delta":
      return {
        messages: [
          { id: crypto.randomUUID(), role: "assistant", content: event.delta, isStreaming: true },
        ],
        isStreaming: true,
      };

    case "thinking_delta":
      // Append to the last assistant message's reasoning
      return {};

    case "tool_start": {
      const toolCall: ToolCall = {
        id: crypto.randomUUID(),
        name: event.toolName,
        params: event.params,
        status: "running",
      };
      return {
        currentToolCall: toolCall,
        toolCalls: [...(agentStore.state.sessions[sessionId]?.toolCalls ?? []), toolCall],
      };
    }

    case "tool_update": {
      const session = agentStore.state.sessions[sessionId];
      if (!session?.currentToolCall) return null;

      const updatedToolCall: ToolCall = {
        ...session.currentToolCall,
        output: (session.currentToolCall.output ?? "") + event.output,
      };
      return {
        currentToolCall: updatedToolCall,
        toolCalls: session.toolCalls.map((tc) =>
          tc.id === updatedToolCall.id ? updatedToolCall : tc,
        ),
      };
    }

    case "tool_end": {
      const session = agentStore.state.sessions[sessionId];
      if (!session?.currentToolCall) return null;

      const completedToolCall: ToolCall = {
        ...session.currentToolCall,
        status: "complete",
      };
      return {
        currentToolCall: undefined,
        toolCalls: session.toolCalls.map((tc) =>
          tc.id === completedToolCall.id ? completedToolCall : tc,
        ),
      };
    }

    case "status_change":
      return {
        isStreaming: event.status === "streaming",
      };

    case "error":
      // Error events set the store-level error
      return {
        isStreaming: false,
      };

    default:
      return null;
  }
}

/**
 * Finalize streaming message (remove isStreaming flag)
 */
function finalizeMessage(sessionId: string) {
  const session = agentStore.state.sessions[sessionId];
  if (!session) return;

  const messages = session.messages.map((msg, index) => {
    if (index === session.messages.length - 1 && msg.isStreaming) {
      return { ...msg, isStreaming: false };
    }
    return msg;
  });

  agentStore.setState((state) => ({
    ...state,
    sessions: {
      ...state.sessions,
      [sessionId]: {
        ...state.sessions[sessionId],
        messages,
      },
    },
  }));
}

/**
 * Create a new agent session
 */
export async function createSession(input: {
  name: string;
  model?: string;
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
}): Promise<AgentSessionState | null> {
  const projectId = projectStore.state.currentProjectId;
  if (!projectId) {
    console.error("[AgentStore] No project selected");
    return null;
  }

  try {
    const session = await rpc.agent.createSession({
      projectId,
      name: input.name,
      model: input.model,
      thinkingLevel: input.thinkingLevel,
    });

    const sessionState: AgentSessionState = {
      ...session,
      messages: [],
      isStreaming: false,
      toolCalls: [],
    };

    agentStore.setState((state) => ({
      ...state,
      sessions: {
        ...state.sessions,
        [session.id]: sessionState,
      },
      activeSessionId: state.activeSessionId ?? session.id,
    }));

    // Invalidate sessions list query
    queryClient.invalidateQueries({ queryKey: ["sessions", projectId] });

    return sessionState;
  } catch (error) {
    console.error("[AgentStore] Failed to create session:", error);
    agentStore.setState((state) => ({
      ...state,
      error: error instanceof Error ? error.message : "Failed to create session",
    }));
    return null;
  }
}

/**
 * Select an active session
 */
export function selectSession(sessionId: string | null) {
  agentStore.setState((state) => ({
    ...state,
    activeSessionId: sessionId,
  }));
}

/**
 * Close and remove a session
 */
export async function closeSession(sessionId: string): Promise<void> {
  const projectId = projectStore.state.currentProjectId;
  if (!projectId) return;

  try {
    await rpc.agent.terminateSession({ projectId, sessionId });

    agentStore.setState((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [sessionId]: _, ...remainingSessions } = state.sessions;
      return {
        ...state,
        sessions: remainingSessions,
        activeSessionId:
          state.activeSessionId === sessionId
            ? (Object.keys(remainingSessions)[0] ?? null)
            : state.activeSessionId,
      };
    });

    // Invalidate sessions list query
    queryClient.invalidateQueries({ queryKey: ["sessions", projectId] });
  } catch (error) {
    console.error("[AgentStore] Failed to close session:", error);
    agentStore.setState((state) => ({
      ...state,
      error: error instanceof Error ? error.message : "Failed to close session",
    }));
  }
}

/**
 * Send a prompt and stream the response
 */
export async function sendPrompt(text: string): Promise<void> {
  const { activeSessionId } = agentStore.state;
  if (!activeSessionId) {
    console.error("[AgentStore] No active session");
    return;
  }

  const projectId = projectStore.state.currentProjectId;
  if (!projectId) {
    console.error("[AgentStore] No project selected");
    return;
  }

  // Optimistic update: add user message
  const userMessage: Message = {
    id: crypto.randomUUID(),
    role: "user",
    content: text,
  };

  agentStore.setState((state) => ({
    ...state,
    connectionStatus: "connecting",
    sessions: {
      ...state.sessions,
      [activeSessionId]: {
        ...state.sessions[activeSessionId],
        messages: [...state.sessions[activeSessionId].messages, userMessage],
      },
    },
  }));

  try {
    agentStore.setState((state) => ({
      ...state,
      connectionStatus: "streaming",
    }));

    // Call the streaming prompt RPC
    const events = await rpc.agent.prompt({
      projectId,
      sessionId: activeSessionId,
      text,
    });

    // Process events as they arrive
    for await (const event of events) {
      // Handle error events at the store level
      if (event.type === "error") {
        agentStore.setState((state) => ({
          ...state,
          error: event.message,
        }));
        continue;
      }

      const updates = handleAgentEvent(activeSessionId, event);

      if (updates) {
        agentStore.setState((state) => ({
          ...state,
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...state.sessions[activeSessionId],
              ...updates,
            },
          },
        }));
      }
    }

    // Finalize the streaming message
    finalizeMessage(activeSessionId);

    agentStore.setState((state) => ({
      ...state,
      connectionStatus: "idle",
    }));
  } catch (error) {
    console.error("[AgentStore] Prompt failed:", error);
    agentStore.setState((state) => ({
      ...state,
      connectionStatus: "error",
      error: error instanceof Error ? error.message : "Prompt failed",
      sessions: {
        ...state.sessions,
        [activeSessionId]: {
          ...state.sessions[activeSessionId],
          isStreaming: false,
        },
      },
    }));
  }
}

/**
 * Abort the current streaming operation
 */
export function abortStreaming(): void {
  const { activeSessionId } = agentStore.state;
  if (!activeSessionId) return;

  // Finalize any streaming messages
  finalizeMessage(activeSessionId);

  agentStore.setState((state) => ({
    ...state,
    connectionStatus: "idle",
    sessions: {
      ...state.sessions,
      [activeSessionId]: {
        ...state.sessions[activeSessionId],
        isStreaming: false,
      },
    },
  }));
}

/**
 * Clear any error state
 */
export function clearError(): void {
  agentStore.setState((state) => ({
    ...state,
    error: null,
  }));
}

/**
 * Reset the store to initial state
 */
export function resetStore(): void {
  agentStore.setState(() => initialState);
}
