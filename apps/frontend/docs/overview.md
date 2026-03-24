# Frontend

The pixxl frontend is a React SPA built with TanStack Start, providing a project-centric IDE interface with integrated terminals and AI agents.

## Architecture

The frontend is organized in layers from UI down to data:

**Routing Layer (TanStack Router)**

- `/` — Landing page
- `/app` — Project selection
- `/app/$projectId` — Main workspace

**UI Layer (App Route)**

Components arranged in the workspace:

- **File Explorer** — Left sidebar, file tree navigation
- **Editor Area** — Main content area
- **Agent Panel** — Right sidebar, chat and actions
- **Terminal Panel** — Bottom panel with terminal tabs

**Data Layer**

- **TanStack Query** — Fetches from backend, manages server state
- **oRPC Client** — Serializes requests, communicates with backend
- **WebSocket** — Real-time connection for terminals
- **TanStack DB** — Local cache with optimistic updates
- **Jotai Atoms** — UI state and derived state

**Data flow summary**

1. User interacts with UI components
2. TanStack Query triggers fetch or mutation
3. oRPC Client sends to backend via HTTP or WebSocket
4. TanStack DB updates immediately (optimistic)
5. Backend response confirms or rolls back the update
6. Jotai atoms manage UI-specific state (dialogs, selection)

## Stack

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Framework  | TanStack Start               |
| Router     | TanStack Router (file-based) |
| Query/Data | TanStack Query + TanStack DB |
| State      | Jotai                        |
| UI         | React 19 + Tailwind CSS      |
| Components | shadcn/ui + Base UI          |
| Terminal   | Ghostty Web                  |
| RPC Client | oRPC Client                  |
| Contracts  | `@pixxl/shared`              |

## Organization

The frontend is organized around concerns:

1. **Routes** — File-based routing
   - Files in routes/ become URLs automatically
   - Layouts wrap child routes
   - Dynamic segments like `$projectId` capture URL parameters

2. **Features** — Domain modules
   - Each feature contains UI components, data access, and state
   - Features: project, agent, terminal, command, config
   - Terminal feature is most complex (includes WebSocket handling)

3. **Shared** — Cross-cutting code
   - Reusable UI components
   - Shared React hooks
   - Utilities and providers

## Routing

| Route             | Purpose                             |
| ----------------- | ----------------------------------- |
| `/`               | Landing page, create/select project |
| `/app`            | Project list, recent projects       |
| `/app/$projectId` | Main workspace for a project        |

The `$projectId` route loads the file explorer, terminal panel, and agent panel for the selected project.

## Features

Each feature contains:

- **Components** — UI for listing, creating, and editing entities
- **Hooks** — Feature-specific React hooks for data and UI state
- **Data** — TanStack DB collection for local caching
- **Types** — TypeScript definitions for the feature

The terminal feature is more complex:

- Handles WebSocket connections in addition to regular data
- Manages terminal lifecycle separately from React component lifecycle
- Integrates Ghostty terminal emulator for rendering

## Data Flow

### Reads

1. Component renders and calls `useSuspenseQuery`
2. TanStack Query checks TanStack DB (local cache) first
3. If data is stale or missing:
   - oRPC Client sends request to backend
   - Backend returns data
   - Cache is updated
4. Component displays the data

### Writes

1. Component calls mutation hook
2. TanStack Query performs optimistic update in TanStack DB
3. oRPC Client sends mutation to backend
4. Backend processes and returns result
5. On success: optimistic update confirmed
6. On error: cache rolls back to previous state

### Terminal WebSocket

1. Component initializes via `terminal-ws.ts`
2. WebSocket connection established to backend
3. Backend attaches to PTY process
4. Bidirectional flow:
   - User input → WebSocket → PTY → Shell
   - Shell output → PTY → WebSocket → Ghostty Terminal (xterm.js)

## State Management

| Layer         | Use For                               | Technology          |
| ------------- | ------------------------------------- | ------------------- |
| Server State  | Projects, agents, terminals, commands | TanStack Query + DB |
| URL State     | Current project ID, view modes        | TanStack Router     |
| UI State      | Dialog open/closed, sidebar collapsed | Jotai atoms         |
| Derived State | Filtered lists, computed values       | Jotai selectors     |

## Running

```bash
# Dev server (Vite+)
vp dev

# Via package manager
pnpm dev:frontend
```

Dev server runs on default Vite port (usually 5173).

## See Also

- [Shared Contracts](../../../packages/shared/docs/) — RPC contracts and schemas
- [Backend](../../../apps/backend/docs/) — Server implementation
- [Ubiquitous Language](../../../docs/ubiquitous-language.md) — Domain terminology
