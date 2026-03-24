# Phase 2: Backend Agent Service

## Goal

Create the core `AgentManager` Effect service that wraps pi SDK sessions.

## Architecture

```
AgentManager (Effect.Service)
├── createSession(projectId, name, model?) → AgentSession
├── getSession(sessionId) → Option<AgentSession>
├── listSessions(projectId) → AgentSession[]
├── terminateSession(sessionId) → void
└── eventBus → Stream<AgentEvent>

AgentSession (wraps pi.AgentSession)
├── id: string
├── projectId: string
├── name: string
├── status: Idle | Streaming | Error
├── piSession: pi.AgentSession
├── subscribe() → Stream<AgentEvent>
├── prompt(text) → Promise<void>
├── abort() → Promise<void>
└── dispose() → void
```

## Implementation

### 1. Create AgentSession entity

**File:** `apps/backend/src/services/agent/AgentSession.ts`

```typescript
import { AgentSession as PiAgentSession } from "@mariozechner/pi-coding-agent";
import { Context, Effect, Layer, Stream } from "effect";
import * as pi from "@mariozechner/pi-coding-agent";

export type AgentStatus = "idle" | "streaming" | "error";

export interface AgentSession {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly status: AgentStatus;
  readonly createdAt: Date;
  readonly piSession: PiAgentSession;
}

export interface AgentEvent {
  readonly sessionId: string;
  readonly type:
    | "message_delta"
    | "thinking_delta"
    | "tool_start"
    | "tool_update"
    | "tool_end"
    | "status_change"
    | "error";
  readonly payload: unknown;
}
```

### 2. Create AgentManager service

**File:** `apps/backend/src/services/agent/AgentManager.ts`

Key methods:

- `createSession` - spawn new pi session via `createAgentSession()`
- `getSession` - lookup active session
- `terminateSession` - cleanup and remove
- `subscribeToEvents` - global event stream for WebSocket broadcast

### 3. pi SDK Configuration

```typescript
// Session config per project
const sessionConfig = {
  sessionManager: pi.SessionManager.inMemory(), // Start with in-memory
  model: pi.getModel("anthropic", "claude-sonnet-4"),
  thinkingLevel: "medium",
  tools: pi.createCodingTools(projectPath), // Tools resolve paths relative to project
};
```

## Data Persistence

Session metadata stored in DB (SQLite via Effect SQL):

- `agent_sessions` table: id, project_id, name, status, created_at, updated_at
- pi's JSONL session files stored at: `{projectPath}/agents/sessions/{sessionId}.jsonl`

## Files to Create

- `apps/backend/src/services/agent/AgentSession.ts`
- `apps/backend/src/services/agent/AgentManager.ts`
- `apps/backend/src/services/agent/index.ts` (barrel export)

## Files to Modify

- `apps/backend/src/services/index.ts` - add AgentManager to service layer
- `apps/backend/src/AppConfig.ts` - add agent configuration

## Testing

- [ ] Create test session via AgentManager
- [ ] Verify pi SDK spawns without errors
- [ ] Verify event streaming works
- [ ] Run `vp test`

## Out of Scope

- No WebSocket yet (Phase 3)
- No RPC routes yet (Phase 8)
- No frontend integration yet
