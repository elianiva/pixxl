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

// Prompt handler - agent-centric, goes through actor
export const promptAgentRpc = os.agent.promptAgent.handler(async function* ({ input }) {
  // Get or create the actor for this agent
  const actor = agentManager.get(input.agentId);

  if (!actor) {
    yield { type: "error" as const, sessionId: input.agentId, message: "Agent actor not found" };
    return;
  }

  const state = actor.getSnapshot();
  if (state.matches("deleted") || state.matches("deleting")) {
    yield { type: "error" as const, sessionId: input.agentId, message: "Agent is being deleted" };
    return;
  }

  // Connect to actor's event stream
  const events: AgentEvent[] = [];
  let done = false;

  // Subscribe to actor events
  const subscription = actor.subscribe((actorState) => {
    if (actorState.matches("streaming")) {
      events.push({ type: "status_change", sessionId: input.agentId, status: "streaming" });
    } else if (actorState.matches("ready")) {
      events.push({ type: "status_change", sessionId: input.agentId, status: "idle" });
      done = true;
    } else if (actorState.matches("error")) {
      events.push({
        type: "error",
        sessionId: input.agentId,
        message: (actorState as { context: { error?: string } }).context.error || "Unknown error",
      });
      done = true;
    }
  });

  // Send prompt to actor
  actor.send({ type: "PROMPT", text: input.text });

  try {
    // Yield events as they arrive
    while (!done || events.length > 0) {
      if (events.length > 0) {
        const event = events.shift()!;
        yield event;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  } finally {
    subscription.unsubscribe();
  }
});

// Queue handlers
export const queueSteerRpc = os.agent.queueSteer.handler(({ input }) => {
  const actor = agentManager.get(input.agentId);
  if (!actor) {
    return Promise.resolve(false);
  }
  actor.send({ type: "QUEUE_STEER", text: input.text });
  return Promise.resolve(true);
});

export const queueFollowUpRpc = os.agent.queueFollowUp.handler(({ input }) => {
  const actor = agentManager.get(input.agentId);
  if (!actor) {
    return Promise.resolve(false);
  }
  actor.send({ type: "QUEUE_FOLLOW_UP", text: input.text });
  return Promise.resolve(true);
});
