import { Effect, Option } from "effect";
import type { AgentEvent } from "@pixxl/shared";
import { os } from "@/contract";
import { AgentService } from "./service";
import { mapToOrpcError } from "@/lib/error";
import { getReadyActor } from "./manager";
import { AsyncEventQueue } from "./queue";

// Agent metadata handlers
export const getAgentRpc = os.agent.getAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.getAgent(input);
    return Option.match(agent, {
      onSome: (agent) => agent,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const createAgentRpc = os.agent.createAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.createAgent(input);
    return Option.match(agent, {
      onSome: (agent) => agent,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const updateAgentRpc = os.agent.updateAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.updateAgent(input);
    return Option.match(agent, {
      onSome: (agent) => agent,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const deleteAgentRpc = os.agent.deleteAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.deleteAgent(input);
    return Option.getOrElse(result, () => false);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const listAgentsRpc = os.agent.listAgents.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listAgents(input);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

// New agent session attachment handlers
export const attachSessionRpc = os.agent.attachSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.attachSession(input);
    return Option.match(agent, {
      onSome: (agent) => agent,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const switchSessionRpc = os.agent.switchSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.switchSession(input);
    return Option.match(agent, {
      onSome: (agent) => agent,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const listAttachableSessionsRpc = os.agent.listAttachableSessions.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listAttachableSessions(input);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const getAgentRuntimeRpc = os.agent.getAgentRuntime.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const state = yield* service.getAgentRuntime(input);
    return Option.match(state, {
      onSome: (state) => state,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const getAgentHistoryRpc = os.agent.getAgentHistory.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const history = yield* service.getAgentHistory(input);
    return Option.match(history, {
      onSome: (history) => history,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const configureAgentSessionRpc = os.agent.configureAgentSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.configureAgentSession(input);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const getAgentFrontendConfigRpc = os.agent.getAgentFrontendConfig.handler(() =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.getAgentFrontendConfig();
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

function isTerminatingEvent(event: AgentEvent): boolean {
  return (
    event.type === "error" ||
    (event.type === "status_change" && (event.status === "idle" || event.status === "error"))
  );
}

export const enqueueAgentPromptRpc = os.agent.enqueueAgentPrompt.handler(async ({ input }) => {
  const result = await getReadyActor(input.projectId, input.agentId);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  result.actor.send({ type: "PROMPT", text: input.text, mode: input.mode });
  return null;
});

export const abortAgentRpc = os.agent.abortAgent.handler(async ({ input }) => {
  const result = await getReadyActor(input.projectId, input.agentId);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  result.actor.send({ type: "ABORT" });
  return null;
});

export const promptAgentRpc = os.agent.promptAgent.handler(async function* ({ input }) {
  const streamId = Math.random().toString(36).slice(2, 8);
  console.log(`[Stream ${streamId}] START project=${input.projectId} agent=${input.agentId}`);

  const result = await getReadyActor(input.projectId, input.agentId);
  if (!result.ok) {
    console.error(`[Stream ${streamId}] ACTOR NOT READY:`, result.error.message);
    yield result.error;
    return;
  }

  const actor = result.actor;
  const queue = new AsyncEventQueue<AgentEvent>();
  let shouldEnd = false;
  let eventCount = 0;

  const client = {
    closed: false,
    send: (event: AgentEvent) => {
      eventCount++;
      console.log(`[Stream ${streamId}] EVENT #${eventCount}:`, event.type);
      queue.push(event);

      if (isTerminatingEvent(event) && !shouldEnd) {
        console.log(`[Stream ${streamId}] TERMINATING EVENT DETECTED`);
        shouldEnd = true;
        queue.close();
      }
    },
  };

  console.log(`[Stream ${streamId}] CONNECTING CLIENT`);
  actor.send({ type: "CLIENT_CONNECT", client });
  console.log(`[Stream ${streamId}] SENDING PROMPT`);
  actor.send({ type: "PROMPT", text: input.text, mode: "immediate" });

  try {
    let yieldedCount = 0;
    while (true) {
      console.log(`[Stream ${streamId}] AWAITING NEXT (yielded=${yieldedCount})`);
      const next = await queue.next();
      if (next === null) {
        console.log(`[Stream ${streamId}] GOT NULL, BREAKING`);
        break;
      }
      yieldedCount++;
      console.log(`[Stream ${streamId}] YIELDING #${yieldedCount}:`, next.type);
      yield next;
    }
    console.log(`[Stream ${streamId}] LOOP ENDED (total yielded=${yieldedCount})`);
  } catch (err) {
    console.error(`[Stream ${streamId}] ERROR IN LOOP:`, err);
    throw err;
  } finally {
    console.log(`[Stream ${streamId}] FINALLY (events=${eventCount}, shouldEnd=${shouldEnd})`);
    client.closed = true;
    queue.close();
    actor.send({ type: "CLIENT_DISCONNECT", client });
    console.log(`[Stream ${streamId}] CLEANUP COMPLETE`);
  }
});
