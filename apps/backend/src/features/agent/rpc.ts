import { Effect, Option } from "effect";
import type { AgentEvent } from "@pixxl/shared";
import { os } from "@/contract";
import { AgentService } from "./service";
import { mapToOrpcError } from "@/lib/error";
import { agentManager } from "./manager";

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

class AsyncEventQueue<T> {
  private items: T[] = [];
  private resolvers: Array<(value: T | null) => void> = [];
  private closed = false;

  push(item: T) {
    if (this.closed) return;

    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver(item);
      return;
    }

    this.items.push(item);
  }

  close() {
    if (this.closed) return;
    this.closed = true;

    while (this.resolvers.length > 0) {
      this.resolvers.shift()?.(null);
    }
  }

  async next(): Promise<T | null> {
    if (this.items.length > 0) {
      return this.items.shift() ?? null;
    }

    if (this.closed) {
      return null;
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }
}

function isTerminalEvent(event: AgentEvent): boolean {
  return (
    event.type === "error" ||
    (event.type === "status_change" && (event.status === "idle" || event.status === "error"))
  );
}

async function getReadyActor(projectId: string, agentId: string) {
  const service = await Effect.gen(function* () {
    return yield* AgentService;
  })
    .pipe(Effect.provide(AgentService.layer), Effect.runPromise)
    .catch(() => null);

  if (service) {
    await Effect.gen(function* () {
      yield* service.ensureAgentActor({ projectId, agentId });
    })
      .pipe(Effect.runPromise)
      .catch(() => null);
  }

  const actor = agentManager.get(agentId);

  if (!actor) {
    return {
      ok: false as const,
      error: { type: "error" as const, sessionId: agentId, message: "Agent actor not found" },
    };
  }

  const state = actor.getSnapshot();
  if (state.matches("deleted") || state.matches("deleting")) {
    return {
      ok: false as const,
      error: { type: "error" as const, sessionId: agentId, message: "Agent is being deleted" },
    };
  }

  if (state.matches("initializing")) {
    return {
      ok: false as const,
      error: { type: "error" as const, sessionId: agentId, message: "Agent is initializing" },
    };
  }

  return { ok: true as const, actor };
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
  const result = await getReadyActor(input.projectId, input.agentId);
  if (!result.ok) {
    yield result.error;
    return;
  }

  const actor = result.actor;
  const queue = new AsyncEventQueue<AgentEvent>();
  let terminalSeen = false;

  const client = {
    closed: false,
    send: (event: AgentEvent) => {
      queue.push(event);

      if (isTerminalEvent(event) && !terminalSeen) {
        terminalSeen = true;
        queue.close();
      }
    },
  };

  actor.send({ type: "CLIENT_CONNECT", client });
  actor.send({ type: "PROMPT", text: input.text, mode: "immediate" });

  try {
    while (true) {
      const next = await queue.next();
      if (next === null) break;
      yield next;
    }
  } finally {
    client.closed = true;
    queue.close();
    actor.send({ type: "CLIENT_DISCONNECT", client });
  }
});
