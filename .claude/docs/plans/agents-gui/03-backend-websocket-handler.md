# Phase 3: Backend WebSocket Handler

## Goal
Implement bidirectional WebSocket for real-time agent event streaming.

## Architecture

```
Client WebSocket
    ↓↑ raw WS messages
AgentWebSocketHandler
    ├── validate session ownership
    ├── route to AgentManager
    └── broadcast events to subscribed clients
```

## Protocol

### Client → Server (JSON)
```typescript
type ClientCommand =
  | { type: "prompt"; sessionId: string; text: string }
  | { type: "abort"; sessionId: string }
  | { type: "new_session"; projectId: string; name: string; model?: string }
  | { type: "close_session"; sessionId: string }
  | { type: "subscribe"; sessionId: string };  // subscribe to events
```

### Server → Client (JSON)
```typescript
type ServerEvent =
  | { type: "message_delta"; sessionId: string; delta: string }
  | { type: "thinking_delta"; sessionId: string; delta: string }
  | { type: "tool_start"; sessionId: string; toolName: string; params: unknown }
  | { type: "tool_update"; sessionId: string; output: string }
  | { type: "tool_end"; sessionId: string; result: unknown; error?: string }
  | { type: "status_change"; sessionId: string; status: AgentStatus }
  | { type: "error"; sessionId: string; message: string }
  | { type: "session_created"; sessionId: string; name: string }
  | { type: "session_closed"; sessionId: string };
```

## Implementation

### File: `apps/backend/src/websocket/AgentWebSocketHandler.ts`

```typescript
import { WebSocket } from "bun";
import { Effect, Stream, Option, Layer } from "effect";
import { AgentManager } from "../services/agent/AgentManager";

export class AgentWebSocketHandler {
  private clients: Map<string, WebSocket> = new Map();
  private sessionSubscriptions: Map<string, Set<string>> = new Map();

  constructor(private agentManager: AgentManager) {}

  handleConnection(ws: WebSocket): Effect<never, never, void> {
    const clientId = crypto.randomUUID();
    this.clients.set(clientId, ws);

    ws.onmessage = (event) => {
      this.handleMessage(clientId, JSON.parse(event.data as string));
    };

    ws.onclose = () => {
      this.cleanup(clientId);
    };

    return Effect.void;
  }

  private handleMessage(
    clientId: string, 
    command: ClientCommand
  ): Effect<never, never, void> {
    return Effect.gen(function* () {
      switch (command.type) {
        case "prompt":
          yield* this.handlePrompt(command);
          break;
        case "new_session":
          yield* this.handleNewSession(command, clientId);
          break;
        // ... etc
      }
    });
  }

  private broadcastEvent(event: ServerEvent): void {
    const message = JSON.stringify(event);
    // Broadcast to all clients subscribed to this session
    const subscribers = this.sessionSubscriptions.get(event.sessionId);
    if (subscribers) {
      for (const clientId of subscribers) {
        const ws = this.clients.get(clientId);
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }
}
```

### Event Forwarding

Connect AgentManager event stream to WebSocket broadcast:

```typescript
// In handler initialization
Effect.gen(function* () {
  const agentManager = yield* AgentManager;
  const eventStream = yield* agentManager.subscribeToEvents();
  
  yield* eventStream.pipe(
    Stream.runForEach((event) => 
      Effect.sync(() => this.broadcastEvent(event))
    )
  );
}).pipe(Effect.fork);
```

## Registration

Add to main server initialization (using existing WebSocket pattern from terminal implementation):

**File:** `apps/backend/src/server.ts` or WebSocket router

```typescript
// Pattern follows existing terminal WebSocket implementation
// Just add new handler for /agents/:sessionId path
```

## Files to Create
- `apps/backend/src/websocket/AgentWebSocketHandler.ts`
- `apps/backend/src/websocket/types.ts` - shared command/event types

## Files to Modify  
- `apps/backend/src/server.ts` - register WebSocket handler
- Existing WebSocket router - add agent path handling

## Testing
- [ ] Connect via WebSocket to `/agents/:sessionId`
- [ ] Send `new_session` command, verify `session_created` response
- [ ] Send `prompt` command, verify streaming `message_delta` events
- [ ] Verify `tool_start/end` events during tool execution
- [ ] Test multiple concurrent sessions

## Out of Scope
- No frontend components yet (Phase 5-7)
- No session persistence beyond in-memory (Phase 2 handled)
- No authentication (handled by existing auth layer)
