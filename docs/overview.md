# pixxl

A local-first, AI-powered code workspace. Pixxl now ships as a packaged macOS desktop app built with Electron, with a local Node backend and a React renderer.

## Overview

Pixxl is a monorepo with four main modules:

- **desktop** (Electron) — App shell, native menu, window lifecycle, local backend startup
- **frontend** (React) — Renderer UI loaded inside the desktop window
- **backend** (Node) — RPC server, PTY bridge, project/agent/terminal services
- **shared** — Contracts, schemas, and shared types

## Modules

| Module | Purpose | Stack |
| --- | --- | --- |
| desktop | Electron shell and app lifecycle | Electron, electron-vite, electron-builder |
| frontend | React renderer UI | TanStack Start, React, Restty |
| backend | Local server and PTY manager | Node, Effect-TS, oRPC, XState |
| shared | Shared contracts and schemas | Effect Schema, oRPC |

## Data flow

1. Desktop starts the local backend server.
2. Desktop opens the renderer window and passes the backend port in the URL.
3. Frontend connects to backend over WebSocket.
4. Backend handles RPC, terminal I/O, and persistence.

## Development

```bash
pnpm install
pnpm dev
pnpm dev:frontend
pnpm dev:desktop
pnpm build
```

## Notes

- macOS only for packaging right now.
- Single window only.
- Storage format stays compatible.