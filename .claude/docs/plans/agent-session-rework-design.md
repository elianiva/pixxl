# Agent session rework

## Problem
Current app conflates durable app-level agents with live pi sessions. Agent metadata persists, but pi sessions are created/stored separately and routed as if agent id == session id.

## Goals
- Agent is durable app entity.
- Agent creation also creates/attaches a persistent pi session.
- Agent deletion removes only app metadata, not pi session.
- Agent can switch attached pi session.
- Session storage/layout should stay compatible with pi CLI/session discovery.
- GUI should be able to attach/open existing pi sessions created outside pixxl.
- Avoid cross-project session attachment.
- Match pi’s queued-message mental model instead of rejecting mid-stream input.

## Final decisions
- **No backward compatibility needed**: project is effectively greenfield here; OK to break current agent/session flow.
- **No cross-project attach**: attached session file must belong to the same project path.
- **Create failure policy**: if pi session file creation succeeds but metadata write fails, try cleanup; if cleanup also fails, surface orphan info explicitly.
- **Queue UI v1**: expose both **steering** and **follow-up** in the UI.
- **Frontend state model**: load **persistent chat + live runtime snapshot**.
- **Queue durability**: runtime-only; queued messages can be lost on backend restart.
- **Abort behavior**: restore queued messages back to editor/input.

## Findings from pi-mono
- pi persists sessions under `~/.pi/agent/sessions/<encoded-cwd>/`.
- Default dir encoding is `--${cwd-with-slashes/colons-replaced-by-dashes}--`.
- Durable identifier is the session file path; pi opens sessions via `SessionManager.open(path)`.
- pi lists project-local sessions via `SessionManager.list(cwd, sessionDir?)`.
- pi can search globally via `SessionManager.listAll()`.
- CLI session resolution prefers local project sessions, then global matches by session id prefix.
- `SessionManager.open(path)` derives `cwd` from the session header, so opening external sessions is supported.
- When already streaming, pi queues new user input instead of rejecting it.
- pi has two queue classes: **steering** (`agent.steer`) and **follow-up** (`agent.followUp`).
- `steeringMode` / `followUpMode` settings control whether queued messages deliver one-at-a-time or all-at-once.
- Pending bash/custom context is flushed before the next prompt, keeping logical ordering consistent.

## Findings from actor / Durable Object research
- Durable Objects work best when modeled around the **atom of coordination**.
- Their key value is **single-threaded serialized access** to per-entity state, not just persistence.
- Good split: execution/runtime/state in the durable object, cognition/tool orchestration elsewhere.
- In-memory state is treated as cache/runtime only; durable storage is source of truth.
- Deterministic identity is important: same logical key should always map to same actor/object.
- Over-centralized singletons are an anti-pattern; one actor per logical entity is the right shape.

## Findings from XState usage/research
- Project already uses XState actors for terminals: machine per terminal + manager cache.
- That existing pattern maps well to agents: `createActor(machine, { input })`, cache by id, inspect via `getSnapshot()`, cleanup on final state.
- XState actor model fits message-based per-entity coordination, especially when local state should stay private and commands serialize through events.
- For this use case, an XState machine actor is more coherent than ad-hoc mutexes if we expect lifecycle states like idle/ready/streaming/error/reattaching.
- Still, actor host should remain lightweight and in-process; durable truth remains files + pi sessions.

## Constraint update
- Do **not** allow cross-project attach.
- Attach validation should require session header `cwd` to match current project path.

## Proposed model
### Durable app entity: Agent
`AgentMetadata` remains the app-owned record.

Preferred shape:
```ts
{
  id: string
  name: string
  createdAt: string
  updatedAt: string
  pi: {
    sessionFile: string
  }
}
```

Notes:
- store `sessionFile`, not pi session id
- keep `pi` nested for future pi-owned metadata
- no need to duplicate `cwd`/`sessionDir`; pi derives enough from the session file header/path

## Actor framing
### Recommendation: make **Agent** the actor, not the pi session
This matches the boundary better.

Why:
- agent is the stable app identity
- pi session is an attached resource that can change
- if the actor identity were the session, “switch session” would fight the model

So:
- **Agent = virtual actor / durable object analogue**
- **pi session = attached runtime dependency + durable session file ref**

### What the actor owns
Durable state:
- agent metadata
- attached `pi.sessionFile`

Ephemeral/in-memory state:
- live `piSession` handle
- active stream/subscription
- connection/subscriber list
- current status / error
- queued steering/follow-up messages
- optional pending next-turn context items

### What actor commands look like
Good candidates:
- `INITIALIZE`
- `PROMPT`
- `QUEUE_STEER`
- `QUEUE_FOLLOW_UP`
- `ATTACH_SESSION`
- `RENAME`
- `ABORT`
- `DELETE_METADATA`
- `HYDRATE`

Key point: commands for the same `agentId` should be serialized by the actor itself.

## XState recommendation
Preferred implementation:
- one **XState machine actor per agent**
- one small manager/registry that caches actors by `agentId`
- manager only does lookup/create/cleanup
- business behavior lives in the machine/actions/actors

Suggested states:
- `hydrating`
- `ready`
- `streaming`
- `switchingSession`
- `deleting`
- `error`
- `deleted` (final)

Context should include:
- metadata snapshot
- live `piSession`
- queued steering messages
- queued follow-up messages
- maybe `pendingNextTurnMessages`
- current subscribers / event buffer if needed

This gives explicit lifecycle, clean serialization, and fits current codebase patterns.

## Service boundary recommendation
### Merge current AgentService + AgentSessionService conceptually
Yes.

Reason:
- `agent` is the primary domain object
- `session` is attached infrastructure/runtime detail
- separate services currently encourage the wrong mental model (`agent` vs `session` as peers)

Preferred shape:
- **AgentService** owns the full agent use case surface
- internal helpers/modules can still exist for pi-specific file/session operations
- but externally there should not be a standalone first-class `AgentSessionService`

Recommended internal split:
- `agent/service.ts` → public feature API
- `agent/actor.ts` → XState machine
- `agent/manager.ts` → actor registry/cache
- `agent/pi.ts` or `agent/session-file.ts` → pi-specific open/list/validate helpers

So: merge at the feature boundary, keep internals modular.

## Boundary split
### Public Agent feature API
Owns:
- create agent
- get agent
- list agents
- rename agent
- delete agent metadata
- attach/switch pi session
- prompt agent
- queue steering message
- queue follow-up message
- get/open runtime state
- discover attachable local pi sessions

### Internal pi/session helper layer
Owns:
- create persistent pi session
- open pi session from file
- validate session file/header
- list compatible same-project sessions
- cleanup newly-created orphan session file
- maybe read effective pi queue settings if we want parity with `steeringMode` / `followUpMode`

This keeps the app model clean: one feature, one main service.

## Routing model
Current route uses `/app/$projectId/agent/$sessionId`.

Preferred route:
- `/app/$projectId/agent/$agentId`

Resolution flow:
1. frontend navigates by `agentId`
2. backend resolves/creates actor for `agentId`
3. actor loads metadata
4. actor opens/reuses pi session from `agent.pi.sessionFile`
5. prompts / queued inputs go through that actor

Reason: app routes should refer to app entities, not transport/runtime internals.

## Create flow
Preferred flow:
1. resolve project path
2. create persistent pi session using pi-compatible storage (`SessionManager.create(projectPath)`)
3. capture `sessionManager.getSessionFile()` from the created/opened session
4. persist agent metadata with `pi.sessionFile`
5. activate/cache actor for immediate use

### Atomicity strategy
We cannot get true DB-style atomicity across:
- pi session file creation
- app metadata file creation

So use a compensating transaction:
- create pi session first
- if metadata write fails, delete the newly created session file iff it was created in this operation and still empty/unclaimed
- if cleanup fails, surface explicit error with orphan path

This gives practical atomic behavior for the normal path.

## Delete flow
When deleting an agent:
- delete only app metadata
- do not terminate/dispose the underlying pi session file by default
- stop/deactivate actor runtime for that agent

Result: session history remains compatible with pi CLI and can be reattached later.

## Switch/attach flow
Add explicit attach/switch mutation on agent metadata:
- input: `projectId`, `agentId`, `sessionFile`
- validate the file is a valid pi session file
- validate session header cwd matches current project path
- open via `SessionManager.open(sessionFile)`
- persist new `agent.pi.sessionFile`
- tell actor to swap runtime handle

This supports:
- sessions created by pixxl
- sessions created by pi CLI
- future “recent sessions” picker

## Queueing model
### Decision: support pi-style queueing, not reject
When an agent is already streaming, new user input should queue.

Preferred behavior:
- support both **steering** and **follow-up**
- default queued input is **steering**
- queue belongs to the **agent actor**, not a global store
- queue ordering is FIFO within each queue type
- queue is **runtime-only**, not durable

### Semantics
- `PROMPT` while `ready` → send immediately
- `PROMPT` while `streaming` + mode `steering` → enqueue steering
- `PROMPT` while `streaming` + mode `follow-up` → enqueue follow-up
- queued steering should be delivered after the current execution boundary, matching pi semantics
- follow-up should wait until the agent fully finishes
- pending next-turn context (if any) should flush before the next real prompt, matching pi ordering rules
- backend restart may lose queued messages
- `ABORT` should restore queued user text/messages back to editor/input rather than silently discarding them

### Suggested parity target
If feasible, mirror pi terms and behaviors in API/UI:
- labels: `steering`, `follow-up`
- future settings room: `steeringMode`, `followUpMode`

## Session discovery for GUI
Recommended listing model:
- primary list: all app agents (durable entities)
- secondary attachable-session list: `SessionManager.list(projectPath)` for current project
- no cross-project attach UI

This matches pi’s behavior and keeps GUI compatible with existing sessions.

## Validation rules
Minimum validation for attach/open:
- file exists
- valid pi session header
- header cwd exists
- header cwd must equal current project path

Cross-project session files should be rejected, not auto-forked.

## Migration
No migration/backward-compat work needed.
Current implementation can be broken/replaced freely.

## Frontend state recommendation
Preferred frontend model:
- load **persistent chat + live runtime snapshot**

Why:
- persistent chat/history should come from durable backend state/pi session
- live actor snapshot should provide transient state the file cannot: `status`, queued messages, maybe current stream/tool state
- this avoids making frontend fully actor-driven while still exposing enough runtime detail for good UX

So the agent page should primarily render:
- durable history/messages
- plus runtime snapshot fields like `status`, `queuedSteering`, `queuedFollowUps`, active stream state

## Recommendation
Preferred design:
- durable agent metadata stores `pi.sessionFile`
- route by `agentId`
- backend exposes one main **AgentService** feature boundary
- agent runtime becomes a lightweight **XState actor host** keyed by `agentId`
- each agent serializes its own commands through the machine
- mid-stream user prompts queue like pi, with **steering** and **follow-up** support
- pi session storage/discovery delegated to pi `SessionManager`
- attach/switch exposed as first-class operation
- delete metadata only
- frontend loads persistent chat plus live runtime snapshot

Why:
- matches pi CLI/session semantics
- survives restarts
- supports external pi sessions
- gives us the main value of actor systems: coordination + race avoidance
- aligns with existing terminal actor pattern in codebase
- avoids overbuilding a distributed actor platform
- preserves the UX expectation that users can keep talking while the agent works

## Non-goal
Do **not** build a full distributed actor runtime right now:
- no remote mailboxes
- no durable event sourcing
- no supervision tree infrastructure yet
- no separate actor persistence model beyond current files + pi sessions

Start with a lightweight in-process XState actor abstraction.

## Concrete steps
1. Merge agent/session feature boundary into one `AgentService`; keep pi/session helpers internal only.
2. Adopt pi-style queueing with both **steering** and **follow-up** semantics; default to steering.
3. Keep queued messages runtime-only and restore them to editor/input on abort.
4. Extend shared agent schema/contracts with nested `pi.sessionFile`, route by `agentId`, and add attach/switch + prompt/queue-by-agent input schemas.
5. Refactor backend agent creation to create a persistent pi session via `SessionManager.create(projectPath)` before writing metadata.
6. Implement compensating cleanup for create failures and surface orphan info if cleanup fails.
7. Introduce `agent/actor.ts` + `agent/manager.ts` with one XState actor per `agentId` that resolves/open/caches pi sessions from `agent.pi.sessionFile` and owns queued messages.
8. Change agent-facing RPCs/prompt flow to resolve through the actor instead of a standalone session service.
9. Change frontend routing/sidebar/store from `sessionId` semantics to `agentId` semantics.
10. Load persistent chat + live runtime snapshot on agent page.
11. Add UI for queued **steering** / **follow-up** messages and reflect runtime queue state clearly.
12. Add same-project session discovery/attach UI backed by `SessionManager.list(projectPath)`.
13. Align queue naming/wording with pi for conceptual consistency.