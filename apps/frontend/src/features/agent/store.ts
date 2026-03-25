import { Store } from "@tanstack/react-store";
import type { AgentMetadata, AgentEvent } from "@pixxl/shared";
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
 * Combined agent state - metadata + runtime
 */
export interface AgentStateItem extends AgentMetadata {
  runtimeStatus?: "idle" | "streaming" | "switchingSession" | "error";
  messages: Message[];
  isStreaming: boolean;
  currentToolCall?: ToolCall;
  toolCalls: ToolCall[];
  queuedSteering: string[];
  queuedFollowUp: string[];
}

/**
 * Agent store state
 */
export interface AgentStoreState {
  agents: Record<string, AgentStateItem>;
  activeAgentId: string | null;
  connectionStatus: "idle" | "connecting" | "streaming" | "error";
  error: string | null;
}

const initialState: AgentStoreState = {
  agents: {},
  activeAgentId: null,
  connectionStatus: "idle",
  error: null,
};

export const agentStore = new Store<AgentStoreState>(initialState);

/**
 * Convert AgentEvent to session state update
 */
function handleAgentEvent(agentId: string, event: AgentEvent): Partial<AgentStateItem> | null {
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
        toolCalls: [...(agentStore.state.agents[agentId]?.toolCalls ?? []), toolCall],
      };
    }

    case "tool_update": {
      const agent = agentStore.state.agents[agentId];
      if (!agent?.currentToolCall) return null;

      const updatedToolCall: ToolCall = {
        ...agent.currentToolCall,
        output: (agent.currentToolCall.output ?? "") + event.output,
      };
      return {
        currentToolCall: updatedToolCall,
        toolCalls: agent.toolCalls.map((tc) =>
          tc.id === updatedToolCall.id ? updatedToolCall : tc,
        ),
      };
    }

    case "tool_end": {
      const agent = agentStore.state.agents[agentId];
      if (!agent?.currentToolCall) return null;

      const completedToolCall: ToolCall = {
        ...agent.currentToolCall,
        status: "complete",
      };
      return {
        currentToolCall: undefined,
        toolCalls: agent.toolCalls.map((tc) =>
          tc.id === completedToolCall.id ? completedToolCall : tc,
        ),
      };
    }

    case "status_change":
      return {
        isStreaming: event.status === "streaming",
        runtimeStatus: event.status,
      };

    case "error":
      // Error events set the store-level error
      return {
        isStreaming: false,
        runtimeStatus: "error",
      };

    default:
      return null;
  }
}

/**
 * Finalize streaming message (remove isStreaming flag)
 */
function finalizeMessage(agentId: string) {
  const agent = agentStore.state.agents[agentId];
  if (!agent) return;

  const messages = agent.messages.map((msg, index) => {
    if (index === agent.messages.length - 1 && msg.isStreaming) {
      return { ...msg, isStreaming: false };
    }
    return msg;
  });

  agentStore.setState((state) => ({
    ...state,
    agents: {
      ...state.agents,
      [agentId]: {
        ...state.agents[agentId],
        messages,
      },
    },
  }));
}

/**
 * Initialize agent data from metadata + runtime
 */
export async function initializeAgent(agent: AgentMetadata, projectId: string): Promise<void> {
  // Get runtime state
  const runtime = await rpc.agent.getAgentRuntime({ projectId, agentId: agent.id });

  agentStore.setState((state) => ({
    ...state,
    agents: {
      ...state.agents,
      [agent.id]: {
        ...agent,
        ...runtime,
        messages: [],
        isStreaming: false,
        toolCalls: [],
        queuedSteering: [],
        queuedFollowUp: [],
      },
    },
  }));
}

/**
 * Create a new agent
 */
export async function createAgent(input: {
  name: string;
  projectId: string;
}): Promise<AgentMetadata | null> {
  try {
    const agent = await rpc.agent.createAgent({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      name: input.name,
    });

    if (!agent) return null;

    // Initialize the agent in store
    await initializeAgent(agent, input.projectId);

    agentStore.setState((state) => ({
      ...state,
      activeAgentId: state.activeAgentId ?? agent.id,
    }));

    // Invalidate agents list query
    void queryClient.invalidateQueries({ queryKey: ["agents", input.projectId] });

    return agent;
  } catch (error) {
    console.error("[AgentStore] Failed to create agent:", error);
    agentStore.setState((state) => ({
      ...state,
      error: error instanceof Error ? error.message : "Failed to create agent",
    }));
    return null;
  }
}

/**
 * Select an active agent
 */
export function selectAgent(agentId: string | null) {
  agentStore.setState((state) => ({
    ...state,
    activeAgentId: agentId,
  }));
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string, projectId: string): Promise<void> {
  try {
    await rpc.agent.deleteAgent({ projectId, id: agentId });

    agentStore.setState((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [agentId]: _, ...remainingAgents } = state.agents;
      return {
        ...state,
        agents: remainingAgents,
        activeAgentId:
          state.activeAgentId === agentId
            ? (Object.keys(remainingAgents)[0] ?? null)
            : state.activeAgentId,
      };
    });

    // Invalidate agents list query
    void queryClient.invalidateQueries({ queryKey: ["agents", projectId] });
  } catch (error) {
    console.error("[AgentStore] Failed to delete agent:", error);
    agentStore.setState((state) => ({
      ...state,
      error: error instanceof Error ? error.message : "Failed to delete agent",
    }));
  }
}

/**
 * Send a prompt to an agent and stream the response
 */
export async function sendPrompt(text: string, agentId?: string): Promise<void> {
  const targetAgentId = agentId ?? agentStore.state.activeAgentId;
  if (!targetAgentId) {
    console.error("[AgentStore] No active agent");
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
    agents: {
      ...state.agents,
      [targetAgentId]: {
        ...state.agents[targetAgentId],
        messages: [...(state.agents[targetAgentId]?.messages ?? []), userMessage],
      },
    },
  }));

  try {
    agentStore.setState((state) => ({
      ...state,
      connectionStatus: "streaming",
    }));

    // Call the streaming prompt RPC
    const events = await rpc.agent.promptAgent({
      projectId,
      agentId: targetAgentId,
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

      const updates = handleAgentEvent(targetAgentId, event);

      if (updates) {
        agentStore.setState((state) => ({
          ...state,
          agents: {
            ...state.agents,
            [targetAgentId]: {
              ...state.agents[targetAgentId],
              ...updates,
            },
          },
        }));
      }
    }

    // Finalize the streaming message
    finalizeMessage(targetAgentId);

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
      agents: {
        ...state.agents,
        [targetAgentId]: {
          ...state.agents[targetAgentId],
          isStreaming: false,
        },
      },
    }));
  }
}

/**
 * Queue a steering message
 */
export async function queueSteer(text: string, agentId?: string): Promise<boolean> {
  const targetAgentId = agentId ?? agentStore.state.activeAgentId;
  if (!targetAgentId) return false;

  const projectId = projectStore.state.currentProjectId;
  if (!projectId) return false;

  // Optimistic update
  agentStore.setState((state) => ({
    ...state,
    agents: {
      ...state.agents,
      [targetAgentId]: {
        ...state.agents[targetAgentId],
        queuedSteering: [...(state.agents[targetAgentId]?.queuedSteering ?? []), text],
      },
    },
  }));

  try {
    return await rpc.agent.queueSteer({ projectId, agentId: targetAgentId, text });
  } catch (error) {
    console.error("[AgentStore] Failed to queue steer:", error);
    return false;
  }
}

/**
 * Queue a follow-up message
 */
export async function queueFollowUp(text: string, agentId?: string): Promise<boolean> {
  const targetAgentId = agentId ?? agentStore.state.activeAgentId;
  if (!targetAgentId) return false;

  const projectId = projectStore.state.currentProjectId;
  if (!projectId) return false;

  // Optimistic update
  agentStore.setState((state) => ({
    ...state,
    agents: {
      ...state.agents,
      [targetAgentId]: {
        ...state.agents[targetAgentId],
        queuedFollowUp: [...(state.agents[targetAgentId]?.queuedFollowUp ?? []), text],
      },
    },
  }));

  try {
    return await rpc.agent.queueFollowUp({ projectId, agentId: targetAgentId, text });
  } catch (error) {
    console.error("[AgentStore] Failed to queue follow-up:", error);
    return false;
  }
}

/**
 * Abort the current streaming operation
 */
export function abortStreaming(agentId?: string): void {
  const targetAgentId = agentId ?? agentStore.state.activeAgentId;
  if (!targetAgentId) return;

  // Finalize any streaming messages
  finalizeMessage(targetAgentId);

  agentStore.setState((state) => ({
    ...state,
    connectionStatus: "idle",
    agents: {
      ...state.agents,
      [targetAgentId]: {
        ...state.agents[targetAgentId],
        isStreaming: false,
      },
    },
  }));
}

/**
 * Switch attached Pi session
 */
export async function switchSession(sessionFile: string, agentId?: string): Promise<void> {
  const targetAgentId = agentId ?? agentStore.state.activeAgentId;
  if (!targetAgentId) return;

  const projectId = projectStore.state.currentProjectId;
  if (!projectId) return;

  try {
    await rpc.agent.switchSession({ projectId, agentId: targetAgentId, sessionFile });

    // Refresh agent data
    const agent = await rpc.agent.getAgent({ projectId, id: targetAgentId });
    if (agent) {
      await initializeAgent(agent, projectId);
    }
  } catch (error) {
    console.error("[AgentStore] Failed to switch session:", error);
    agentStore.setState((state) => ({
      ...state,
      error: error instanceof Error ? error.message : "Failed to switch session",
    }));
  }
}

/**
 * List attachable sessions for current project
 */
export async function listAttachableSessions(): Promise<
  ReadonlyArray<{
    readonly path: string;
    readonly id: string;
    readonly cwd: string;
    readonly name?: string;
    readonly firstMessage: string;
    readonly messageCount: number;
  }>
> {
  const projectId = projectStore.state.currentProjectId;
  if (!projectId) return [];

  try {
    return await rpc.agent.listAttachableSessions({ projectId });
  } catch (error) {
    console.error("[AgentStore] Failed to list attachable sessions:", error);
    return [];
  }
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
