# Terminal Persistence Design (Tmux-Style)

**Goal:** Enable terminal sessions to survive client disconnect/reconnect without process termination (tmux attach/reattach behavior)

**Status:** Phase 1 - In-memory persistence only (server restart = session death)

---

## Problem Statement

Currently, when the last client disconnects from a terminal:
1. Actor transitions to `closing` state
2. PTY process is killed
3. All work is lost

We need sessions to persist like tmux/zellij - process keeps running, client can reattach later.

---

## Architecture

### Core Insight from Zellij
Zelij uses **serialization to layout files** every 1 second for session resurrection. For Phase 1, we avoid serialization complexity and use **in-memory scrollback buffer + detached state**.

### State Machine Changes

```
Current:  idle → starting → active → closing → closed
                 ↑___________↓

New:      idle → starting → active ──► detached ◄──┐
                 ↑___________↓         │          │
                     ▲───────────────────┘          │
                     └───────────────────────────────┘
```

**Key changes:**
- `CLIENT_DISCONNECT` with 1 client remaining → `detached` (not `closing`)
- `CLIENT_CONNECT` from `detached` → `active`
- Only `CLOSE` event or process exit → `closing`

### Data Structures

```typescript
interface TerminalSession {
  terminalId: string;
  shell: string;
  cwd: string;
  clients: Set<Client>;           // Empty when detached
  terminal?: Bun.Terminal;          // PTY process
  scrollback: CircularBuffer<Uint8Array>;  // Last N KB for replay
  metadata: {
    createdAt: Date;
    lastActivity: Date;
    attachCount: number;
    isDetached: boolean;
  };
}
```

---

## Edge Cases to Handle

### 1. Resize on Reattach (SIGWINCH)
**Problem:** New client has different terminal dimensions than when detached.
**Solution:** On `CLIENT_CONNECT`:
1. Replay scrollback (client sees old content)
2. Send `SIGWINCH` or resize PTY to new dimensions
3. Client sends its size via `resize` message immediately after connect

### 2. Process Death While Detached
**Problem:** Shell exits while no clients connected. Session becomes "zombie".
**Solution:**
- `exit()` callback fires in detached state
- Transition to `dead` state (new terminal state)
- On next `CLIENT_CONNECT`, check if dead → start fresh or show "session ended" message

### 3. Concurrent Attach (Race Condition)
**Problem:** Two clients connect simultaneously to detached session.
**Solution:** XState handles this - both send `CLIENT_CONNECT`, both added to Set, no race.

### 4. Scrollback Buffer Overflow
**Problem:** Unbounded memory growth from long-running processes.
**Solution:** Circular buffer with max size (e.g., 100KB or 1000 lines). Old content discarded.

### 5. Binary Output in Scrollback
**Problem:** Images, curses apps, binary data in scrollback - breaks replay.
**Solution:** Store raw bytes (Uint8Array), replay verbatim. Terminal emulator handles rendering.

### 6. Detached Session Listing
**Problem:** User needs to see what terminals are running but detached.
**Solution:** TerminalManager exposes `listDetached()` for UI. Shows: id, shell, cwd, detachedSince, process status.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Circular buffer vs full history** | Bounded memory, matches terminal emulator behavior |
| **No serialization (Phase 1)** | Complexity cost > value for MVP. Zellij only added this in v0.39 after years of development |
| **Store raw bytes, not parsed content** | No terminal state machine needed, simpler replay |
| **Process death = terminal death** | No zombie process tracking in Phase 1. Reattach to dead session = fresh start |
| **Immediate scrollback replay** | No streaming - client gets full state in one burst, then live updates |

---

## UI/UX Considerations

### Reattach Flow
1. User navigates to terminal route (`/terminal/:id`)
2. Frontend opens WebSocket
3. Backend detects existing detached session
4. Backend replays scrollback burst
5. Frontend renders immediately, then receives live updates

### Detached Session Indicator
- Show "Detached" badge when user disconnects
- Auto-reattempt connection every 5s (or manual "Reconnect" button)

### Session Manager (Future)
- List all terminals: attached, detached, dead
- Allow explicit "Kill" on detached sessions
- Show metadata: runtime, command, cwd

---

## Decisions (Resolved)

| Question | Decision |
|----------|----------|
| Buffer size | 10,000 lines default, configurable |
| Resize timing | Wait for client's initial `resize` message after connect |
| Dead session UX | Show "Session ended" message in terminal area (not dialog), with restart option |
| Cleanup policy | Never auto-kill (tmux style) - explicit user cleanup only |

---

## Next Steps

Ready for implementation plan.
