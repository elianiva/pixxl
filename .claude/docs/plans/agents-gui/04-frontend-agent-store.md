# Phase 4: Frontend Agent Store

## Goal

Create TanStack Store for agent session state and WebSocket management.

## Architecture

```
AgentStore (TanStack Store)
├── sessions: Map<string, AgentSession>
├── activeSessionId: string | null
├── connectionStatus: "connecting" | "connected" | "disconnected"
├── webSocket: WebSocket | null
├── actions:
│   ├── createSession(projectId, name)
│   ├── selectSession(sessionId)
│   ├── closeSession(sessionId)
│   ├── sendPrompt(text)
│   ├── abort()
│   └── connect(projectId)
└── event handlers:
    ├── onMessageDelta
    ├── onThinkingDelta
    ├── onToolStart/Update/End
    └── onStatusChange
```

## Implementation

### File: `apps/frontend/src/features/agents/store.ts`

```typescript
import { Store } from "@tanstack/react-store";
import type { AgentStatus, ServerEvent } from "../shared/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  reasoning?: string;
  tools?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  params: unknown;
  status: "running" | "complete" | "error";
  output?: string;
  error?: string;
}

interface AgentSession {
  id: string;
  name: string;
  status: AgentStatus;
  messages: Message[];
  isStreaming: boolean;
  currentToolCall?: ToolCall;
}

interface AgentState {
  sessions: Record<string, AgentSession>;
  activeSessionId: string | null;
  connectionStatus: "connecting" | "connected" | "disconnected";
  error: string | null;
}

const initialState: AgentState = {
  sessions: {},
  activeSessionId: null,
  connectionStatus: "disconnected",
  error: null,
};

export const agentStore = new Store({
  state: initialState,
});
```

### WebSocket Connection

```typescript
// In store or separate WebSocket service
let ws: WebSocket | null = null;

export function connectToAgentServer(projectId: string) {
  const wsUrl = `${getWebSocketUrl()}/agents?projectId=${projectId}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    agentStore.setState((state) => ({
      ...state,
      connectionStatus: "connected",
    }));
  };

  ws.onmessage = (event) => {
    const serverEvent: ServerEvent = JSON.parse(event.data);
    handleServerEvent(serverEvent);
  };

  ws.onclose = () => {
    agentStore.setState((state) => ({
      ...state,
      connectionStatus: "disconnected",
    }));
  };
}

function handleServerEvent(event: ServerEvent) {
  switch (event.type) {
    case "message_delta":
      appendMessageDelta(event.sessionId, event.delta);
      break;
    case "tool_start":
      startToolCall(event.sessionId, event.toolName, event.params);
      break;
    // ... etc
  }
}
```

### Actions

```typescript
export const agentActions = {
  createSession: (projectId: string, name: string) => {
    const ws = getWebSocket(); // get current ws connection
    ws?.send(
      JSON.stringify({
        type: "new_session",
        projectId,
        name,
      }),
    );
  },

  sendPrompt: (text: string) => {
    const { activeSessionId } = agentStore.state;
    if (!activeSessionId) return;

    // Optimistic update for user message
    agentStore.setState((state) => ({
      ...state,
      sessions: {
        ...state.sessions,
        [activeSessionId]: {
          ...state.sessions[activeSessionId],
          messages: [
            ...state.sessions[activeSessionId].messages,
            { id: crypto.randomUUID(), role: "user", content: text },
          ],
        },
      },
    }));

    getWebSocket()?.send(
      JSON.stringify({
        type: "prompt",
        sessionId: activeSessionId,
        text,
      }),
    );
  },

  // ... etc
};
```

## Hooks

### File: `apps/frontend/src/features/agents/hooks.ts`

```typescript
export function useAgentSessions() {
  return useStore(agentStore, (state) => Object.values(state.sessions));
}

export function useActiveSession() {
  return useStore(agentStore, (state) =>
    state.activeSessionId ? state.sessions[state.activeSessionId] : null,
  );
}

export function useStreamingMessage() {
  const session = useActiveSession();
  const lastMessage = session?.messages.at(-1);
  return lastMessage?.isStreaming ? lastMessage : null;
}

export function useAgentConnection() {
  return useStore(agentStore, (state) => state.connectionStatus);
}
```

## Files to Create

- `apps/frontend/src/features/agents/store.ts` - TanStack Store instance
- `apps/frontend/src/features/agents/hooks.ts` - React hooks
- `apps/frontend/src/features/agents/types.ts` - TypeScript interfaces

## Files to Modify

- `apps/frontend/src/features/index.ts` - export agent features
- `apps/shared/src/types.ts` - add agent event types

## Testing

- [ ] Store state updates correctly on events
- [ ] WebSocket connects/disconnects properly
- [ ] Optimistic updates work for user messages
- [ ] Message streams append correctly
- [ ] Tool call states update properly

## Out of Scope

- No UI components yet (Phase 5-7)
- No backend integration (already done in Phase 3)
- No route/page setup yet
