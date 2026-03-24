# pixxl

A local-first, AI-powered code workspace. Pixxl combines a project-centric file explorer with integrated terminals and autonomous agents that can navigate, edit, and execute code within your projects.

## Overview

Pixxl is built as a monorepo with three main modules:

**Modules**

- **frontend** (React) — The user interface
  - Uses TanStack Router and TanStack Query
  - Ghostty Terminal for terminal rendering
  - Depends on `shared` for type-safe contracts

- **shared** (contracts) — Shared definitions between frontend and backend
  - oRPC contracts for API definitions
  - Effect Schema for validation
  - Used by both frontend and backend

- **backend** (Bun) — The server
  - Effect-TS for business logic
  - WebSocket for real-time terminal I/O
  - Depends on `shared` for contract definitions

**Relationships**

- Frontend imports contracts and schemas from Shared
- Backend imports contracts and schemas from Shared
- Frontend connects to Backend via HTTP/WebSocket

## Modules

| Module | Purpose | Stack |
|--------|---------|-------|
| [frontend](../apps/frontend/docs/) | React SPA, file explorer, terminal UI, agent interface | TanStack Start, React Query, Ghostty |
| [backend](../apps/backend/docs/) | RPC server, WebSocket handler, terminal process manager | Bun, Effect-TS, oRPC, XState |
| [shared](../packages/shared/docs/) | Contracts, schemas, types shared between frontend and backend | Effect Schema, oRPC |

## Data Flow

**Request path (Frontend → Backend)**

1. User Action triggers React Component
2. TanStack Query initiates the request
3. oRPC Client serializes and sends data
4. WebSocket/HTTP transports to backend
5. Effect Services handle the business logic
6. oRPC Server formats the response
7. Atom updates React State
8. TanStack DB caches locally

**Key flows**

- Reads: Component → Query → Cache (or Backend if stale)
- Writes: Component → Mutation → Optimistic update → Backend → Confirm/Rollback
- Terminal I/O: WebSocket bidirectional stream between browser and PTY process

## Core Concepts

See [Ubiquitous Language](../docs/ubiquitous-language.md) for definitions of key terms.

## Communication Patterns

**RPC (Request/Response)**

Standard CRUD operations for projects, agents, terminals, and configuration. Uses oRPC with Effect Schema validation.

Operations:
- Create, read, update, delete for all entities
- Contract-based with typed inputs/outputs
- Automatic error handling and validation

**WebSocket (Real-time)**

- **Terminal I/O**: Bidirectional stream between browser (xterm.js/Ghostty) and backend PTY process
  - Character input from browser to shell
  - Output stream from shell to terminal display
- **Agent Streaming**: Agent thought process and action execution progress

**Local-First Data**

TanStack DB provides optimistic UI with local caching:
- UI responds immediately on user actions
- Background sync with backend for persistence
- Automatic rollback on errors

## Module Interactions

**Frontend ←→ Shared**

- Frontend imports contracts to know what operations are available
- Frontend imports schemas to validate data at runtime
- Shared provides the source of truth for types and APIs

**Backend ←→ Shared**

- Backend implements the contracts defined in Shared
- Backend uses schemas to validate incoming requests
- Shared ensures frontend and backend agree on data shapes

**Frontend ←→ Backend**

- Frontend sends HTTP requests for CRUD operations
- Frontend opens WebSocket connections for real-time terminal I/O
- Backend processes requests and returns structured responses

## Development

```bash
# Install dependencies
vp install

# Run both frontend and backend
vp run dev

# Run individually
vp run dev:frontend
vp run dev:backend
```

See individual module docs for detailed setup:
- [Frontend](../apps/frontend/docs/)
- [Backend](../apps/backend/docs/)
- [Shared](../packages/shared/docs/)
