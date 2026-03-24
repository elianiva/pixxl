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

## Config Schema Alignment

### Backend Schema

**File:** `packages/shared/src/schema/config.ts` ✅

Updated `AgentSchema` to align with pi's settings:

| Field | Type | Description |
|-------|------|-------------|
| `defaultProvider` | `string?` | Model provider (e.g., "anthropic") |
| `defaultModel` | `string?` | Model ID |
| `defaultThinkingLevel` | `ThinkingLevel?` | "off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" |
| `transport` | `Transport?` | "sse" \| "websocket" \| "auto" |
| `steeringMode` | `SteeringMode?` | "all" \| "one-at-a-time" |
| `followUpMode` | `FollowUpMode?` | "all" \| "one-at-a-time" |
| `compaction` | `CompactionSettings?` | Context compaction config |
| `retry` | `RetrySettings?` | Retry on rate limit/overload |
| `hideThinkingBlock` | `boolean?` | Hide thinking from output |
| `shellPath` | `string?` | Custom shell path |
| `packages` | `string[]?` | NPM/git package sources |
| `extensions` | `string[]?` | Extension paths |
| `skills` | `string[]?` | Skill paths |
| `prompts` | `string[]?` | Prompt template paths |
| `themes` | `string[]?` | Theme paths |
| `thinkingBudgets` | `ThinkingBudgets?` | Token budgets per level |
| `terminal` | `TerminalSettings?` | Terminal display settings |
| `images` | `ImageSettings?` | Image processing settings |
| `markdown` | `MarkdownSettings?` | Markdown rendering |

### Frontend Settings

**File:** `apps/frontend/src/features/config/components/settings-agent.tsx` ✅

Updated to match new schema:

- Provider selector → `defaultProvider`
- Model selector → `defaultModel`
- Thinking level selector → `defaultThinkingLevel`
- Transport selector → `transport`
- Steering mode selector → `steeringMode`
- Hide thinking toggle → `hideThinkingBlock`
- Skill commands toggle → `enableSkillCommands`

**File:** `apps/frontend/src/features/config/components/setting-row.tsx` ✅

Added `SettingRowToggle` component for boolean settings.

**File:** `apps/frontend/src/features/config/hooks/use-blur-submit.ts` ✅

Added `useBlurSubmitSelect` hook for controlled select components.

## Files Created

- `apps/backend/src/features/agent/session/types.ts`
- `apps/backend/src/features/agent/session/service.ts`
- `apps/backend/src/features/agent/session/index.ts`

## Files Modified

**Backend:**
- `apps/backend/src/features/agent/error.ts` - added session errors
- `apps/backend/src/features/agent/rpc.ts` - added TODO stubs
- `packages/shared/src/schema/config.ts` - aligned with pi settings
- `packages/shared/src/contracts/config.ts` - simplified update schema
- `apps/backend/src/features/config/service.ts` - fixed validation

**Frontend:**
- `apps/frontend/src/features/config/components/settings-agent.tsx` - new settings UI
- `apps/frontend/src/features/config/components/setting-row.tsx` - added toggle
- `apps/frontend/src/features/config/hooks/use-blur-submit.ts` - added select hook

## Next Steps (Phase 3)

- Add WebSocket server for real-time event streaming
- Wire up `piSession.subscribe()` to broadcast events to clients
- Add `prompt()` and `abort()` methods to service

## Out of Scope

- No WebSocket server yet (Phase 3)
- No event streaming via WebSocket yet (Phase 3)
- No RPC routes with full implementation (Phase 8)
- No frontend integration yet
