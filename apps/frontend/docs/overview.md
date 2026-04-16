# Frontend

The pixxl frontend is the renderer UI inside the Electron desktop app. It is a React SPA built with TanStack Start and connects to the local backend over WebSocket.

## Architecture

- Routing: TanStack Router
- Data: TanStack Query + TanStack DB
- State: Jotai
- Terminal: Restty
- RPC: oRPC client

## Backend connection

When loaded from the desktop app, the backend port is passed in the URL as backendPort.
Standalone dev falls back to 127.0.0.1:3000.

## Running

```bash
pnpm dev:frontend
pnpm dev
```

Dev server runs on the default Vite port (usually 5173).

## See also

- Backend: ../../../apps/backend/docs/overview.md
- Shared: ../../../packages/shared/docs/overview.md
- Project overview: ../../../docs/overview.md