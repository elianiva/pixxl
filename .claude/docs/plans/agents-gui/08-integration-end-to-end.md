# Phase 8: Integration and End-to-End

## Goal
Wire everything together: connect frontend to backend, test full flow, polish UX.

## Integration Tasks

### 1. WebSocket Connection

**File:** `apps/frontend/src/features/agents/services/websocket.ts`

```typescript
import { agentStore, agentActions } from "../store";

let ws: WebSocket | null = null;
let reconnectAttempt = 0;
const MAX_RECONNECT = 5;

export function connectToAgents(projectId: string): void {
  const wsUrl = `${getWsUrl()}/agents`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    agentStore.setState((s) => ({ ...s, connectionStatus: "connected" }));
    reconnectAttempt = 0;
    
    // Send initial project subscription
    ws?.send(JSON.stringify({ type: "subscribe_project", projectId }));
  };
  
  ws.onmessage = (event) => {
    const serverEvent = JSON.parse(event.data);
    handleServerEvent(serverEvent);
  };
  
  ws.onclose = () => {
    agentStore.setState((s) => ({ ...s, connectionStatus: "disconnected" }));
    maybeReconnect(projectId);
  };
  
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    agentStore.setState((s) => ({ 
      ...s, 
      connectionStatus: "disconnected",
      error: "Connection failed"
    }));
  };
}

export function disconnectFromAgents(): void {
  ws?.close();
  ws = null;
}

export function sendCommand(command: ClientCommand): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(command));
  } else {
    console.error("WebSocket not connected");
    agentStore.setState((s) => ({
      ...s,
      error: "Not connected to agent server",
    }));
  }
}

function handleServerEvent(event: ServerEvent): void {
  switch (event.type) {
    case "message_delta":
      agentActions.appendMessageDelta(event.sessionId, event.delta);
      break;
    case "thinking_delta":
      agentActions.appendThinking(event.sessionId, event.delta);
      break;
    case "tool_start":
      agentActions.startTool(event.sessionId, event.toolName, event.params);
      break;
    case "tool_update":
      agentActions.updateTool(event.sessionId, event.output);
      break;
    case "tool_end":
      agentActions.endTool(event.sessionId, event.result, event.error);
      break;
    case "status_change":
      agentActions.setSessionStatus(event.sessionId, event.status);
      break;
    case "session_created":
      agentActions.addSession({
        id: event.sessionId,
        name: event.name,
        status: "idle",
        messages: [],
      });
      break;
    case "error":
      agentActions.setError(event.message);
      break;
  }
}

function maybeReconnect(projectId: string): void {
  if (reconnectAttempt >= MAX_RECONNECT) {
    console.error("Max reconnect attempts reached");
    return;
  }
  reconnectAttempt++;
  setTimeout(() => connectToAgents(projectId), 1000 * reconnectAttempt);
}
```

### 2. Backend Router Integration

**File:** Verify `apps/backend/src/routers/index.ts` includes agent routes

```typescript
import { AgentRouterLive } from "./AgentRouter";

export const AppRouterLive = Layer.mergeAll(
  // ... existing routers
  AgentRouterLive,
);
```

### 3. WebSocket Route Registration

**File:** `apps/backend/src/server.ts` - Ensure WebSocket handler registered

```typescript
// In WebSocket upgrade handler
if (path.startsWith("/agents")) {
  const projectId = getQueryParam(path, "projectId");
  if (!projectId) {
    ws.close(4000, "Missing projectId");
    return;
  }
  
  // Verify project exists, authenticate, etc.
  const handler = yield* AgentWebSocketHandler;
  handler.handleConnection(ws, projectId);
}
```

## End-to-End Testing

### Test Scenarios

**Scenario 1: Happy Path**
1. Navigate to `/agents`
2. Create new session
3. Type message, send
4. Verify:
   - Message appears in chat
   - Server receives WebSocket `prompt` command
   - `message_delta` events stream back
   - AI response accumulates in UI

**Scenario 2: Tool Execution**
1. Prompt: "List files in src directory"
2. Verify:
   - `tool_start` received (bash/ls)
   - Tool call displays inline
   - `tool_update` shows live output
   - `tool_end` completes
   - Agent responds with results

**Scenario 3: Multiple Sessions**
1. Create session A
2. Send message, wait for response
3. Create session B
4. Send different message
5. Switch between sessions
6. Verify each session maintains its own messages

**Scenario 4: Reconnection**
1. Kill backend
2. Frontend should show "Reconnecting..."
3. Restart backend
4. Frontend should reconnect automatically
5. Resume chatting

## Bug Fixes and Polish

### Error Handling

```typescript
// In AgentChat
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
      <h3 className="font-medium text-red-400">Something went wrong</h3>
      <p className="text-sm text-red-300">{error.message}</p>
      <Button onClick={() => location.reload()} className="mt-3">
        Reload
      </Button>
    </div>
  );
}

// Wrap AgentChat
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <AgentChat />
</ErrorBoundary>
```

### Performance Optimizations

1. **Virtualization for long conversations**
   - Use `@tanstack/react-virtual` for message list if needed

2. **Debounced scroll**
   - Scroll to bottom only on meaningful changes

3. **Memoization**
   - Memoize message components
   - Don't re-render streaming content on every delta

```typescript
const MemoizedMessage = memo(Message, (prev, next) => {
  // Only re-render if streaming state changes or content differs
  return prev.message.id === next.message.id && 
         prev.message.isStreaming === next.message.isStreaming;
});
```

## Files to Verify/Modify

- `apps/frontend/src/features/agents/` - all Phase 4-7 files
- `apps/backend/src/websocket/AgentWebSocketHandler.ts` - Phase 3
- `apps/backend/src/services/agent/AgentManager.ts` - Phase 2
- `apps/frontend/src/routeTree.gen.ts` - verify routes

## Testing Commands

```bash
# Build everything
vp build

# Run tests
vp test

# Type check
vp check

# Start dev servers
vp run dev
```

## Acceptance Criteria

- [ ] Create session → chat → see streaming response (under 5 seconds)
- [ ] Tool call displays inline with correct tool type
- [ ] Multiple sessions work, switching is fast
- [ ] Reconnection works within 3 attempts
- [ ] No 500 errors in backend logs
- [ ] No React warnings in console
- [ ] `vp test` passes 80%+ on agent features
- [ ] Dark mode looks good
- [ ] Mobile view is usable (sidebar collapses)

## Demo Script

1. Show empty agents page
2. Create new session → "Session 1"
3. Type: "What files are in this project?"
4. Watch streaming response, see tool call
5. Create second session → "Session 2"
6. Switch between sessions, show different histories
7. Refresh page, sessions persist

## Sign-off Checklist

- [ ] All files committed
- [ ] All tests pass
- [ ] No TODOs or FIXMEs in code
- [ ] AGENTS.md updated with agent commands
- [ ] Changes rebased onto main via jj

## Out of Scope (MVP Complete)

- No branching UI
- No @ file references
- No /commands
- No message queue
- No session forking
