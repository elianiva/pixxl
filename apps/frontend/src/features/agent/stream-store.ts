import { Store } from "@tanstack/react-store";
import { generateId, type AgentEvent } from "@pixxl/shared";

export interface StreamToolCall {
  id: string;
  name: string;
  params: unknown;
  status: "running" | "complete" | "error";
  output?: string;
  error?: string;
}

export interface StreamMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
  toolCalls?: StreamToolCall[];
}

export interface AgentStreamState {
  requestId: string | null;
  isStreaming: boolean;
  optimisticUserMessage: StreamMessage | null;
  draftAssistantMessage: StreamMessage | null;
  error: string | null;
}

export interface StreamState {
  byAgentId: Record<string, AgentStreamState>;
}

const initialAgentState = (): AgentStreamState => ({
  requestId: null,
  isStreaming: false,
  optimisticUserMessage: null,
  draftAssistantMessage: null,
  error: null,
});

const initialState: StreamState = {
  byAgentId: {},
};

export const streamStore = new Store<StreamState>(initialState);

function getAgentState(state: StreamState, agentId: string): AgentStreamState {
  return state.byAgentId[agentId] ?? initialAgentState();
}

function updateAgentState(agentId: string, updater: (state: AgentStreamState) => AgentStreamState) {
  streamStore.setState((state) => ({
    ...state,
    byAgentId: {
      ...state.byAgentId,
      [agentId]: updater(getAgentState(state, agentId)),
    },
  }));
}

export function beginAgentStream(agentId: string, userText: string): string {
  const requestId = generateId();

  updateAgentState(agentId, () => ({
    requestId,
    isStreaming: true,
    error: null,
    optimisticUserMessage: {
      id: `optimistic-user-${requestId}`,
      role: "user",
      content: userText,
    },
    draftAssistantMessage: {
      id: `draft-assistant-${requestId}`,
      role: "assistant",
      content: "",
      reasoning: "",
      isStreaming: true,
      toolCalls: [],
    },
  }));

  return requestId;
}

export function finishAgentStream(agentId: string, requestId: string) {
  updateAgentState(agentId, (state) => {
    if (state.requestId !== requestId) return state;
    return initialAgentState();
  });
}

export function failAgentStream(agentId: string, requestId: string, message: string) {
  updateAgentState(agentId, (state) => {
    if (state.requestId !== requestId) return state;
    return {
      ...state,
      isStreaming: false,
      draftAssistantMessage: state.draftAssistantMessage
        ? {
            ...state.draftAssistantMessage,
            isStreaming: false,
          }
        : null,
      error: message,
    };
  });
}

export function applyAgentEvent(agentId: string, requestId: string, event: AgentEvent) {
  updateAgentState(agentId, (state) => {
    if (state.requestId !== requestId) return state;

    const draftAssistantMessage = state.draftAssistantMessage
      ? { ...state.draftAssistantMessage }
      : {
          id: `draft-assistant-${requestId}`,
          role: "assistant" as const,
          content: "",
          reasoning: "",
          isStreaming: true,
          toolCalls: [],
        };

    const toolCalls = [...(draftAssistantMessage.toolCalls ?? [])];

    switch (event.type) {
      case "thinking_delta":
        draftAssistantMessage.reasoning = `${draftAssistantMessage.reasoning ?? ""}${event.delta}`;
        break;
      case "message_delta":
        draftAssistantMessage.content = `${draftAssistantMessage.content}${event.delta}`;
        break;
      case "tool_start":
        toolCalls.push({
          id: generateId(),
          name: event.toolName,
          params: event.params,
          status: "running",
        });
        draftAssistantMessage.toolCalls = toolCalls;
        break;
      case "tool_update": {
        const current = toolCalls.at(-1);
        if (current) {
          current.output = `${current.output ?? ""}${event.output}`;
          draftAssistantMessage.toolCalls = toolCalls;
        }
        break;
      }
      case "tool_end": {
        const current = toolCalls.at(-1);
        if (current) {
          current.status = event.error ? "error" : "complete";
          current.error = event.error;
          draftAssistantMessage.toolCalls = toolCalls;
        }
        break;
      }
      case "error":
        return {
          ...state,
          isStreaming: false,
          draftAssistantMessage: {
            ...draftAssistantMessage,
            isStreaming: false,
          },
          error: event.message,
        };
      case "status_change":
        if (event.status !== "streaming") {
          draftAssistantMessage.isStreaming = false;
        }
        break;
    }

    return {
      ...state,
      isStreaming:
        event.type === "status_change" ? event.status === "streaming" : state.isStreaming,
      draftAssistantMessage,
    };
  });
}

export function getStreamStateForAgent(state: StreamState, agentId: string): AgentStreamState {
  return getAgentState(state, agentId);
}

export function resetStreamState() {
  streamStore.setState(() => initialState);
}
