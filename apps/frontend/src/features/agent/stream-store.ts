import { Store } from "@tanstack/react-store";
import { generateId, type AgentEvent, type PiSessionEntry } from "@pixxl/shared";

export interface StreamPartialEntry {
  entryId: string;
  parentId: string;
  content: string;
  reasoning?: string;
  role: "assistant";
  toolCalls: {
    id: string;
    name: string;
    params: unknown;
    status: "running" | "complete" | "error";
    output?: string;
    error?: string;
  }[];
}

export interface AgentStreamState {
  requestId: string | null;
  isStreaming: boolean;
  entries: PiSessionEntry[]; // Session entries from getAgentHistory
  partialEntry: StreamPartialEntry | null;
  error: string | null;
}

export interface StreamState {
  byAgentId: Record<string, AgentStreamState>;
}

const initialAgentState = (): AgentStreamState => ({
  requestId: null,
  isStreaming: false,
  entries: [],
  partialEntry: null,
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

export interface BeginStreamResult {
  requestId: string;
}

export function beginAgentStream(agentId: string): BeginStreamResult {
  const requestId = generateId();

  updateAgentState(agentId, (state) => ({
    ...state,
    requestId,
    isStreaming: true,
    error: null,
    // Keep existing entries, will append new ones as they arrive
    partialEntry: null, // Will be created on first delta
  }));

  return { requestId };
}

export function setAgentEntries(agentId: string, entries: PiSessionEntry[]) {
  // Validate entries have id property before casting
  updateAgentState(agentId, (state) => ({
    ...state,
    entries,
  }));
}

export function finishAgentStream(agentId: string, requestId: string) {
  updateAgentState(agentId, (state) => {
    if (state.requestId !== requestId) return state;
    return {
      ...state,
      isStreaming: false,
      requestId: null,
      partialEntry: null, // Clear partial on finish
    };
  });
}

export function clearStreamState(agentId: string) {
  updateAgentState(agentId, () => initialAgentState());
}

export function failAgentStream(agentId: string, requestId: string, message: string) {
  updateAgentState(agentId, (state) => {
    if (state.requestId !== requestId) return state;
    return {
      ...state,
      isStreaming: false,
      requestId: null,
      partialEntry: null,
      error: message,
    };
  });
}

export function applyAgentEvent(agentId: string, requestId: string | null, event: AgentEvent) {
  updateAgentState(agentId, (state) => {
    // For initial sync, requestId might be null
    if (requestId && state.requestId !== requestId) return state;

    const newState = { ...state };

    switch (event.type) {
      case "entry_added": {
        const entry = event.entry as PiSessionEntry;
        const exists = newState.entries.some((e) => e.id === entry.id);
        if (!exists) {
          newState.entries = [...newState.entries, entry];
        }
        break;
      }

      case "entry_updated": {
        const entry = event.entry as PiSessionEntry;
        newState.entries = newState.entries.map((e) => (e.id === entry.id ? entry : e));
        if (newState.partialEntry?.entryId === entry.id) {
          newState.partialEntry = null;
        }
        break;
      }

      case "message_delta": {
        // Append to partial entry
        if (!newState.partialEntry) {
          // Create new partial entry on first delta
          newState.partialEntry = {
            entryId: event.entryId,
            parentId: newState.entries.at(-1)?.id ?? "",
            content: event.delta,
            role: "assistant",
            toolCalls: [],
          };
        } else if (newState.partialEntry.entryId === event.entryId) {
          newState.partialEntry = {
            ...newState.partialEntry,
            content: newState.partialEntry.content + event.delta,
          };
        }
        break;
      }

      case "thinking_delta": {
        if (newState.partialEntry?.entryId === event.entryId) {
          newState.partialEntry = {
            ...newState.partialEntry,
            reasoning: (newState.partialEntry.reasoning ?? "") + event.delta,
          };
        }
        break;
      }

      case "tool_start": {
        if (newState.partialEntry) {
          newState.partialEntry = {
            ...newState.partialEntry,
            toolCalls: [
              ...newState.partialEntry.toolCalls,
              {
                id: generateId(),
                name: event.toolName,
                params: event.params,
                status: "running",
              },
            ],
          };
        }
        break;
      }

      case "tool_update": {
        if (newState.partialEntry?.toolCalls.length) {
          const toolCalls = [...newState.partialEntry.toolCalls];
          const current = toolCalls.at(-1);
          if (current) {
            current.output = (current.output ?? "") + event.output;
          }
          newState.partialEntry = { ...newState.partialEntry, toolCalls };
        }
        break;
      }

      case "tool_end": {
        if (newState.partialEntry?.toolCalls.length) {
          const toolCalls = [...newState.partialEntry.toolCalls];
          const current = toolCalls.at(-1);
          if (current) {
            current.status = event.error ? "error" : "complete";
            current.error = event.error;
          }
          newState.partialEntry = { ...newState.partialEntry, toolCalls };
        }
        break;
      }

      case "status_change": {
        newState.isStreaming = event.status === "streaming";
        if (event.status !== "streaming") {
          newState.partialEntry = null;
        }
        break;
      }

      case "error": {
        newState.isStreaming = false;
        newState.error = event.message;
        newState.partialEntry = null;
        break;
      }
    }

    return newState;
  });
}

export function getStreamStateForAgent(state: StreamState, agentId: string): AgentStreamState {
  return getAgentState(state, agentId);
}

export function resetStreamState() {
  streamStore.setState(() => initialState);
}
