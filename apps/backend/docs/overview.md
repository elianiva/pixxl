# Backend

The pixxl backend is a Bun-based server providing RPC endpoints and WebSocket connections for real-time terminal I/O.

## Architecture

The backend handles two types of connections:

**HTTP/WebSocket Handler** — Entry point for all connections

**RPC Handler (oRPC)**

- Receives structured requests from frontend
- Routes to appropriate procedure
- Procedures organized by feature:
  - Config Procedures
  - Project Procedures
  - Agent Procedures
  - Terminal Procedures
  - Command Procedures

**Terminal WebSocket**

- Handles raw terminal I/O connections
- Routes to Terminal Actor (XState state machine)
- Terminal Actor manages PTY Process lifecycle

**Request flow**

1. Client connects via HTTP or WebSocket
2. RPC requests go to Router → Procedure → Effect Service
3. Terminal connections go to WebSocket → Actor → PTY
4. Responses flow back through the same path

## Stack

| Layer             | Technology      |
| ----------------- | --------------- |
| Runtime           | Bun             |
| RPC Framework     | oRPC            |
| Schema Validation | Effect Schema   |
| Business Logic    | Effect-TS       |
| State Machines    | XState          |
| Contracts         | `@pixxl/shared` |

## Organization

The backend is organized into layers:

**Entry Point**

- WebSocket upgrade handling
- RPC interceptor for error handling
- Server startup

**Router**

- Assembles all feature procedures into the oRPC router
- Both frontend and backend share the same router contract from Shared

**Features**

- Each feature (config, project, agent, terminal, command) follows the same pattern
- RPC handlers receive requests and delegate to services
- Effect-TS services contain the actual business logic

**Utilities**

- Error serialization for consistent error responses

## Feature Structure

Each feature follows the same pattern:

- **RPC handlers** — Receive requests, validate input, call services
- **Services** — Effect-TS business logic, pure computations
- **Errors** — Domain-specific error definitions
- **Types** — Internal type definitions

The terminal feature is more complex:

- WebSocket handler for real-time I/O
- XState actor for terminal lifecycle management
- Manager for PTY process management

## Communication

### RPC (Port 3000)

All state mutations and queries use oRPC over WebSocket:

```typescript
// Client calls
os.router({
  project: { createProject, deleteProject, listProjects },
  agent: { createAgent, updateAgent, ... },
  terminal: { createTerminal, connectTerminal, ... },
})
```

### Terminal WebSocket

Terminal connections use a separate WebSocket protocol:

**Connection flow**

1. Client connects via WebSocket
2. Bun Server accepts and identifies terminal by path `/terminal/{terminalId}`
3. Server spawns or attaches to PTY (pseudo-terminal)
4. PTY runs the shell process
5. Bidirectional data:
   - Client input → WebSocket → PTY → Shell
   - Shell output → PTY → WebSocket → Client

## Error Handling

Errors are structured with feature context:

```typescript
{
  error: {
    feature: "terminal",    // Domain module
    code: "NOT_FOUND",      // Machine-readable code
    message: "...",         // Human-readable
    details?: {...}         // Optional context
  }
}
```

All errors flow through the RPC interceptor in `main.ts`.

## Running

```bash
# Hot reload dev server
bun --hot src/main.ts

# Via package manager
pnpm dev
```

Server listens on port 3000 (configurable via `HONO_PORT`).

## See Also

- [Shared Contracts](../../../packages/shared/docs/) — RPC contract definitions
- [Ubiquitous Language](../../../docs/ubiquitous-language.md) — Domain terminology
