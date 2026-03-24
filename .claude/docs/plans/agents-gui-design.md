# Agents GUI - Design Plan

## Problem Statement

Pixxl needs an agent management interface that provides a GUI wrapper around the pi coding agent. Currently, agents are mentioned in the architecture (agents/ folder in project metadata) but no UI exists to interact with them.

## Goals

1. Provide a visual interface for creating, configuring, and managing AI agents
2. Enable chat-based interaction with agents (like Claude Code / Cursor)
3. Display agent activity/status in real-time
4. Integrate with the existing project-centric file explorer

## Known Requirements

- Agents stored in `{workspacePath}/{projectName}/agents/`
- Agent configs, prompts, and message history persisted there
- WebSocket already used for terminal I/O and agent streaming
- Backend uses Effect-TS, frontend uses React + TanStack
- Project-specific agents only (no global agents for MVP)

## Architecture

### Core Pattern: Pixxl AgentSession wraps pi SDK

Similar to how `Terminal` wraps a PTY process, `AgentSession` wraps a pi `AgentSession`:

```
Pixxl AgentSession
    ├── id, name, status (our metadata)
    ├── projectId (which project this agent belongs to)
    └── inner: pi.AgentSession (from createAgentSession)
```

Multiple concurrent sessions per project are supported - each Pixxl agent = one dedicated pi session.

### High-Level Flow

**Frontend (React)**
```
Chat UI Component
    ↓
WebSocket (bidirectional streaming)
    ↓
Backend WebSocket handler
```

**Backend (Effect-TS)**
```
AgentManager (Effect.Service)
    ├── createSession(projectId, name) → AgentSession
    ├── getSession(id) → AgentSession
    └── terminateSession(id)

AgentSession
    ├── piSession: pi.AgentSession
    ├── subscribeToEvents() → Stream<AgentEvent>
    ├── prompt(message) → Promise<void>
    └── dispose()
```

### Key Components

**1. Pixxl Agent Session Management (AgentManager Service)**
- In-memory registry of active sessions (Map<sessionId, AgentSession>)
- Each session wraps one pi SDK session via `createAgentSession()`
- Multiple concurrent sessions per project supported
- Sessions have: id, name, projectId, createdAt, status (idle/streaming/error)
- Persistence: session metadata in DB, pi session files in `{project}/agents/sessions/{sessionId}.jsonl`

**2. Event Streaming (WebSocket)**
- Bidirectional WebSocket per active session
- Frontend → Backend: `prompt`, `steer`, `abort`, `newSession`
- Backend → Frontend: pi SDK events forwarded

**Event types to stream:**
| Event | UI Action |
|-------|-----------|
| `message_update` (text_delta) | Append to streaming message |
| `message_update` (thinking_delta) | Show in thinking panel (collapsible) |
| `tool_execution_start` | Show "Reading src/file.ts..." |
| `tool_execution_update` | Stream live bash output inline |
| `tool_execution_end` | Finalize tool result display |
| `turn_start/end` | Update agent status indicator |
| `agent_start/end` | Show/hide "Agent is working..." |

**3. Chat Interface (streamdown.ai)**
- Use https://streamdown.ai for streaming markdown rendering
- Message list: user messages, assistant responses, tool results
- Streaming text display with markdown support
- Tool call visualization:
  - `read`: Show file path + content preview (collapsible)
  - `write`: Show file path + diff preview
  - `edit`: Show unified diff inline
  - `bash`: Show command + live output stream (inline, like terminal)
- Input box: plain text for MVP (no @file refs or /commands yet)

**4. Session Management UI**
- Session list sidebar (like browser tabs)
- New session button
- Delete/close session
- Session rename
- **No branching UI for MVP** (defer pi's `/tree` feature)

### Data Flow

**User sends message:**
1. Frontend: User types → `ws.send({ type: 'prompt', text })`
2. Backend: AgentManager routes to AgentSession by ID
3. AgentSession: `piSession.prompt(text)`
4. pi SDK: Streams events via `session.subscribe()`
5. Backend: Forwards events to WebSocket
6. Frontend: Receives events, updates React state

**Tool execution (bash example):**
1. pi SDK emits `tool_execution_start` (bash, command)
2. Backend forwards to frontend
3. Frontend shows command in chat as "Running: `npm test`"
4. pi SDK streams `tool_execution_update` (output chunks)
5. Frontend appends to inline terminal-like block
6. pi SDK emits `tool_execution_end` (exit code)
7. Frontend finalizes block, shows success/error

## MVP Scope

**Included:**
- Create/close agent sessions
- Chat with streaming responses
- Tool execution displayed inline (read/write/edit/bash)
- Multiple concurrent sessions per project
- Session persistence (metadata + pi session files)

**Deferred:**
- Branching (pi's `/tree`)
- @file references
- /commands
- Message queue (steer/follow-up)

## Tech Choices

| Component | Choice | Why |
|-----------|--------|-----|
| Markdown streaming | streamdown.ai | Purpose-built for LLM streaming |
| WebSocket | ws (Bun) + native WebSocket (browser) | Already used for terminals |
| pi SDK | `@mariozechner/pi-coding-agent` | Full SDK access |
| Session storage | Project metadata folder (`{project}/agents/`) | Matches existing pattern |

## Data Model (Pixxl)

```typescript
// AgentSession entity (stored in DB + in-memory)
interface AgentSession {
  id: string;
  projectId: string;
  name: string;
  status: 'idle' | 'streaming' | 'error';
  createdAt: Date;
  updatedAt: Date;
  piSessionPath: string; // Path to pi's JSONL file
  
  // Runtime only (not persisted)
  piSession?: AgentSession; // pi SDK session instance
  wsClients?: Set<WebSocket>; // Subscribed clients
}
```

## API Surface (Backend → Frontend)

**WebSocket Events (Backend → Frontend):**
```typescript
type ServerEvent = 
  | { type: 'message_delta'; sessionId: string; delta: string }
  | { type: 'thinking_delta'; sessionId: string; delta: string }
  | { type: 'tool_start'; sessionId: string; toolName: string; params: unknown }
  | { type: 'tool_update'; sessionId: string; output: string }
  | { type: 'tool_end'; sessionId: string; result: unknown }
  | { type: 'status_change'; sessionId: string; status: AgentStatus }
  | { type: 'error'; sessionId: string; message: string };
```

**WebSocket Commands (Frontend → Backend):**
```typescript
type ClientCommand = 
  | { type: 'prompt'; sessionId: string; text: string }
  | { type: 'abort'; sessionId: string }
  | { type: 'new_session'; projectId: string; name: string }
  | { type: 'close_session'; sessionId: string };
```

## Routes

| Route | Purpose |
|-------|---------|
| `/agents` | Agent session list page |
| `/agents/:sessionId` | Chat interface for specific session |

## Status

✅ Design complete - ready for implementation

## Implementation Plans

Broken into 8 phases, each a single jj commit:

1. **Phase 1** - Dependencies installation
2. **Phase 2** - Backend AgentManager service
3. **Phase 3** - Backend WebSocket handler
4. **Phase 4** - Frontend store and state management
5. **Phase 5** - Frontend chat UI components
6. **Phase 6** - Frontend tool display components
7. **Phase 7** - Frontend routes and pages
8. **Phase 8** - Integration and end-to-end testing

See: `agents-gui/` folder for full plan details.
