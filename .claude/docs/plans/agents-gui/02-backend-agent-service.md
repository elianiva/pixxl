# Phase 2: Backend Agent Session Service ✅

## Goal

Create the `AgentSessionService` that wraps pi SDK sessions, following existing backend patterns.

## Architecture

```
AgentSessionService (extends ServiceMap.Service)
├── createSession(projectId, projectPath, name, model?, thinkingLevel?) → Effect<AgentSession>
├── getSession(projectId, sessionId) → Effect<Option<AgentSession>>
├── listSessions(projectId) → Effect<AgentSession[]>
└── terminateSession(projectId, sessionId) → Effect<void, SessionNotFoundError | SessionTerminateError>

AgentSession (data entity)
├── id: string
├── projectId: string
├── name: string
├── status: "idle" | "streaming" | "error"
├── piSession: PiAgentSession
└── createdAt: Date
```

## Implementation

### 1. Session Errors

**File:** `apps/backend/src/features/agent/error.ts` ✅

Added:
- `SessionNotFoundError` - session lookup failed
- `SessionTerminateError` - failed to cleanup session

### 2. Session Types

**File:** `apps/backend/src/features/agent/session/types.ts` ✅

- `AgentSession` - session entity with pi session reference
- `AgentSessionEvent` - union of event types
- `StoredSession` - internal storage type

### 3. AgentSessionService

**File:** `apps/backend/src/features/agent/session/service.ts` ✅

Key implementation details:

```typescript
// WebSocket transport configured via SettingsManager
const settingsManager = SettingsManager.create(input.projectPath);
settingsManager.setTransport("websocket");

// Coding tools resolve paths relative to project
const tools = createCodingTools(input.projectPath);

// Create pi session
const { session: piSession } = await createAgentSession({
  cwd: input.projectPath,
  tools,
  settingsManager,
  thinkingLevel: input.thinkingLevel ?? "medium",
});
```

### 4. pi SDK Integration

- **Transport**: WebSocket (via `settingsManager.setTransport("websocket")`)
- **Session Manager**: Default (`SessionManager.create(cwd)`)
- **Tools**: `createCodingTools(projectPath)` - provides read, bash, edit, write tools
- **Thinking Level**: Configurable per session, defaults to "medium"

## Data Persistence

Session metadata stored via existing `EntityService` (Phase 4).

pi's session files stored at:
- `{projectPath}/.pi/sessions/{sessionId}.jsonl`

## Files Created

- `apps/backend/src/features/agent/session/types.ts`
- `apps/backend/src/features/agent/session/service.ts`
- `apps/backend/src/features/agent/session/index.ts`

## Files Modified

- `apps/backend/src/features/agent/error.ts` - added session errors
- `apps/backend/src/features/agent/rpc.ts` - added TODO stubs

## Next Steps (Phase 3)

- Add WebSocket server for real-time event streaming
- Wire up `piSession.subscribe()` to broadcast events to clients
- Add `prompt()` and `abort()` methods to service

## Out of Scope

- No WebSocket server yet (Phase 3)
- No event streaming via WebSocket yet (Phase 3)
- No RPC routes with full implementation (Phase 8)
- No frontend integration yet
