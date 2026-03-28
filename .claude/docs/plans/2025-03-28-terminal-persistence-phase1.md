# Terminal Persistence Phase 1 Implementation Plan

**Goal:** Enable terminal sessions to survive client disconnect/reconnect (tmux-style attach/reattach)

**Architecture:** XState machine adds `detached` state between `active` and `closing`. Scrollback buffer captures output for replay. Process lifecycle decoupled from client presence.

**Tech Stack:** XState, Bun.Terminal, Effect (Schema), React

---

## Prerequisites

- [ ] Read current terminal actor implementation: `@/apps/backend/src/features/terminal/actor.ts`
- [ ] Read terminal manager: `@/apps/backend/src/features/terminal/manager.ts`
- [ ] Read WebSocket handler: `@/apps/backend/src/features/terminal/ws-handler.ts`
- [ ] Read frontend terminal hook: `@/apps/frontend/src/features/terminal/hooks/use-ghostty-terminal.ts`

---

## Phase 1A: Backend State Machine Refactoring

### Task 1: Add Circular Buffer Utility
**File:** `apps/backend/src/features/terminal/scrollback-buffer.ts`

Create a fixed-size circular buffer for terminal output:

```typescript
export class ScrollbackBuffer {
  constructor(maxLines: number = 10000);
  push(data: Uint8Array): void;
  *iter(): Generator<Uint8Array>;  // For replay
  clear(): void;
  get size(): number;
}
```

**Test:** `apps/backend/src/features/terminal/scrollback-buffer.test.ts`
- Push 5 items with maxLines=3 → only last 3 retrievable
- Iterator yields in insertion order

### Task 2: Extend TerminalActorContext
**File:** `apps/backend/src/features/terminal/actor.ts`

Add to context:
- `scrollback: ScrollbackBuffer`
- `metadata: { createdAt, lastActivity, attachCount }`

### Task 3: Add `detached` State to State Machine
**File:** `apps/backend/src/features/terminal/actor.ts`

**Modify states:**

1. Change `active.CLIENT_DISCONNECT` guard:
   - `clients.size > 1` → stay `active`, `removeClient`
   - `clients.size === 1` → `detached`, `removeClient`, `persistScrollback`

2. Add new `detached` state:
   ```typescript
   detached: {
     entry: ['clearClients', 'updateLastActivity'],
     on: {
       CLIENT_CONNECT: {
         target: 'active',
         actions: ['addClient', 'replayScrollback', 'incrementAttachCount']
       },
       CLOSE: 'closing',
       PROCESS_EXIT: 'dead'  // New transition for when PTY dies while detached
     }
   }
   ```

3. Add new `dead` state (terminal ended while detached):
   ```typescript
   dead: {
     type: 'final',
     entry: 'markDead'
   }
   ```

### Task 4: Add Scrollback Capture Action
**File:** `apps/backend/src/features/terminal/actor.ts`

In `spawnTerminal` action, modify `data` callback:
- Broadcast to clients (existing)
- ALSO push to `context.scrollback.push(output)`

### Task 5: Add Replay Action
**File:** `apps/backend/src/features/terminal/actor.ts`

Create `replayScrollback` action:
- Iterate `context.scrollback`
- Send each chunk to the new `event.client`

### Task 6: Handle Process Exit While Detached
**File:** `apps/backend/src/features/terminal/actor.ts`

Modify `exit` callback in `spawnTerminal`:
- If state is `detached` → send `{ type: 'PROCESS_EXIT', exitCode }` to self
- If state is `active` → existing behavior (notify clients)

### Task 7: Add Dead Session Detection to Manager
**File:** `apps/backend/src/features/terminal/manager.ts`

Modify `getOrCreate()`:
- Check if existing actor is in `dead` state
- If dead, cleanup and create fresh

Add method:
```typescript
getSessionState(terminalId): 'active' | 'detached' | 'dead' | 'none'
listDetached(): Array<{terminalId, shell, cwd, detachedAt, scrollbackSize}>
```

---

## Phase 1B: Protocol Changes (Backend)

### Task 8: Add `sync` Message Type
**File:** `apps/backend/src/features/terminal/ws-handler.ts`

Add to `handleTerminalMessage`:
```typescript
case 'sync':
  // Trigger scrollback replay for this client
  data.actor.send({ type: 'CLIENT_CONNECT', client: data.client });
  break;
```

### Task 9: Handle Initial Resize After Connect
**File:** `apps/backend/src/features/terminal/ws-handler.ts`

The first `resize` message after `CLIENT_CONNECT` should:
1. Update PTY dimensions
2. Send `SIGWINCH` equivalent (if Bun supports) or just resize

---

## Phase 1C: Frontend Changes

### Task 10: Add `sync` Request on Connect
**File:** `apps/frontend/src/features/terminal/hooks/use-ghostty-terminal.ts`

In WebSocket `onopen`:
```typescript
ws.send(JSON.stringify({ type: 'sync' }));
// Then send initial resize
ws.send(JSON.stringify({ 
  type: 'resize', 
  cols: terminal.cols, 
  rows: terminal.rows 
}));
```

### Task 11: Handle Dead Session Message
**File:** `apps/frontend/src/features/terminal/hooks/use-ghostty-terminal.ts`

Add handler for new message type:
```typescript
case 'dead':
  terminal.write('\r\n\x1b[31mSession ended\x1b[0m\r\n');
  // Show restart UI
  options.onDead?.(message.exitCode);
  break;
```

### Task 12: Add Dead Session UI Component
**File:** New component or inline in terminal page

When session is dead, overlay on terminal container:
- Message: "Session ended (exit code N)"
- Button: "Start New Terminal" → triggers terminal recreation

---

## Phase 1D: Integration & Testing

### Task 13: Test Disconnect/Reconnect Flow
**Manual test:**
1. Open terminal in browser tab
2. Type some commands (generate scrollback)
3. Close browser tab (disconnect)
4. Open new tab, navigate to same terminal ID
5. **Verify:** Scrollback replayed, can continue session

### Task 14: Test Resize on Reattach
**Manual test:**
1. Open terminal, resize browser to 80x24
2. Run `stty size` (note output)
3. Disconnect
4. Resize browser to 120x40
5. Reconnect
6. **Verify:** `stty size` shows new dimensions

### Task 15: Test Process Death While Detached
**Manual test:**
1. Open terminal, run `sleep 100`
2. Disconnect
3. Kill process externally (find PID, `kill -9`)
4. Reconnect
5. **Verify:** "Session ended" message displayed, restart option available

---

## Verification Checklist

- [ ] Scrollback buffer unit tests pass
- [ ] XState machine compiles without errors
- [ ] State transitions: `idle → starting → active → detached → active` work
- [ ] Concurrent attach (two tabs) works correctly
- [ ] Process exit while active notifies clients
- [ ] Process exit while detached marks session dead
- [ ] Scrollback replay works (client sees previous output)
- [ ] Resize on reattach updates PTY
- [ ] Dead session shows integrated message (not dialog)

---

## Files Modified/Created

| File | Action |
|------|--------|
| `apps/backend/src/features/terminal/scrollback-buffer.ts` | Create |
| `apps/backend/src/features/terminal/scrollback-buffer.test.ts` | Create |
| `apps/backend/src/features/terminal/actor.ts` | Modify significantly |
| `apps/backend/src/features/terminal/manager.ts` | Modify |
| `apps/backend/src/features/terminal/ws-handler.ts` | Modify |
| `apps/frontend/src/features/terminal/hooks/use-ghostty-terminal.ts` | Modify |
| `apps/frontend/src/routes/app/$projectId/terminal/$terminalId.index.tsx` | Modify (add dead UI) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Scrollback memory bloat | 10k line limit, Uint8Array dedup if possible |
| Replay floods slow clients | Stream with setImmediate/setTimeout yields |
| State machine complexity | Keep changes isolated to terminal actor |
| Bun.Terminal API changes | Abstract behind interface, minimal surface area |

---

Ready to implement. Start with Task 1 (scrollback buffer).
