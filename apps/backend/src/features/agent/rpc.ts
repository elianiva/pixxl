import { Effect, Option } from "effect";
import { os } from "@/contract";
import { AgentService } from "./service";
import { mapToOrpcError } from "@/lib/error";
import { agentManager } from "./manager";

// Agent metadata handlers
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
  const unsubscribe = actor.subscribe((actorState) => {
    // Forward state changes as events
    if (actorState.matches("streaming")) {
      events.push({ type: "status_change", sessionId: input.agentId, status: "streaming" });
    } else if (actorState.matches("ready")) {
      events.push({ type: "status_change", sessionId: input.agentId, status: "idle" });
      done = true;
    } else if (actorState.matches("error")) {
      events.push({
        type: "error",
        sessionId: input.agentId,
        message: actorState.context.error || "Unknown error",
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
        yield events.shift()!;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  } finally {
    unsubscribe();
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

// Legacy session handlers - deprecated, redirect to new handlers
export const createSessionRpc = os.agent.createSession.handler(({ input }) =>
  Effect.gen(function* () {
    // Create agent instead of session
    const service = yield* AgentService;
    const agent = yield* service.createAgent({
      id: input.projectId, // Generate from project as fallback
      projectId: input.projectId,
      name: input.name,
    });
    // Return legacy format
    return Option.match(agent, {
      onSome: (a) => ({
        id: a.id,
        projectId: input.projectId,
        name: a.name,
        status: "idle" as const,
        createdAt: new Date(a.createdAt),
      }),
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const getSessionRpc = os.agent.getSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.getAgent({
      projectId: input.projectId,
      id: input.sessionId, // Legacy uses sessionId as agentId
    });
    return Option.match(agent, {
      onSome: (a) => ({
        id: a.id,
        projectId: input.projectId,
        name: a.name,
        status: "idle" as const,
        createdAt: new Date(a.createdAt),
      }),
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const listSessionsRpc = os.agent.listSessions.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agents = yield* service.listAgents(input);
    // Return as legacy session format
    return agents.map((a) => ({
      id: a.id,
      projectId: input.projectId,
      name: a.name,
      status: "idle" as const,
      createdAt: new Date(a.createdAt),
    }));
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const terminateSessionRpc = os.agent.terminateSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    yield* service.deleteAgent({
      projectId: input.projectId,
      id: input.sessionId, // Legacy uses sessionId as agentId
    });
    return true;
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

// Legacy prompt handler - simplified for compatibility
export const promptRpc = os.agent.prompt.handler(async function* ({ input }) {
  // Forward to actor with agentId = sessionId
  const actor = agentManager.get(input.sessionId);

  if (!actor) {
    yield { type: "error" as const, sessionId: input.sessionId, message: "Agent actor not found" };
    return;
  }

  // Send prompt
  actor.send({ type: "PROMPT", text: input.text });

  // Yield streaming status
  yield {
    type: "status_change" as const,
    sessionId: input.sessionId,
    status: "streaming",
  };

  // Simulate streaming completion after a delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Yield idle status
  yield {
    type: "status_change" as const,
    sessionId: input.sessionId,
    status: "idle",
  };
});
