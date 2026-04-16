# Backend

The pixxl backend is a local Node server used by the Electron desktop app. It exposes oRPC over WebSocket plus a dedicated PTY WebSocket for terminal I/O.

## Architecture

**RPC**

- Requests come from the renderer via oRPC/WebSocket.
- Feature routers delegate to Effect services.
- Shared contracts live in @pixxl/shared.

**Terminal WebSocket**

- Handles /pty?terminalId=... connections.
- Attaches clients to terminal actors.
- Terminal actors own PTY lifecycle and scrollback.

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| RPC | oRPC |
| Validation | Effect Schema |
| Business logic | Effect-TS |
| State machines | XState |
| PTY | zigpty |

## Running

The backend is started by the desktop app. For typechecking only:

```bash
pnpm --filter @pixxl/backend check
```

## See also

- Frontend: ../../../apps/frontend/docs/overview.md
- Shared: ../../../packages/shared/docs/overview.md
- Project overview: ../../../docs/overview.md