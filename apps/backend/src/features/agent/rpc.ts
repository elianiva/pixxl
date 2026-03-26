import { Effect, Option, Stream } from "effect";
import { os } from "@/contract";
import { AgentService } from "./service";
import { mapToOrpcError } from "@/lib/error";
import { AgentNotFoundError } from "./error";

// Helper to unwrap Option to nullable for RPC responses
const toNullable = <T>(opt: Option.Option<T>): T | null =>
  Option.match(opt, { onSome: (x) => x, onNone: () => null });

export const getAgentRpc = os.agent.getAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.getAgent({ agentId: input.id });
    return toNullable(result);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const createAgentRpc = os.agent.createAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.createAgent(input);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const updateAgentRpc = os.agent.updateAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.updateAgent(input);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const deleteAgentRpc = os.agent.deleteAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    yield* service.deleteAgent({ agentId: input.id });
    return true;
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const listAgentsRpc = os.agent.listAgents.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listAgents({ projectId: input.projectId });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const attachSessionRpc = os.agent.attachSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.attachSession({
      agentId: input.agentId,
      sessionFile: input.sessionFile,
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
    return yield* service.attachSession({
      agentId: input.agentId,
      sessionFile: input.sessionFile,
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
    // Need project path - look it up from project service via an agent
    const agents = yield* service.listAgents({ projectId: input.projectId });
    if (agents.length === 0) return [];
    // Get project path from first agent
    return [];
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const getAgentRuntimeRpc = os.agent.getAgentRuntime.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    return Option.match(instanceOpt, {
      onNone: () => null,
      onSome: (instance) => ({
        agentId: input.agentId,
        projectId: input.projectId,
        status: instance.status,
        queuedSteering: instance.queuedSteering,
        queuedFollowUp: instance.queuedFollowUp,
        currentSessionFile: instance.metadata.pi.sessionFile,
        model: instance.currentModel,
        thinkingLevel: instance.thinkingLevel,
      }),
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
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    return Option.match(instanceOpt, {
      onNone: () => null,
      onSome: (instance) => {
        const header = instance.sessionManager.getHeader();
        if (!header) return null;

        const sessionName = instance.sessionManager.getSessionName();
        return {
          agentId: input.agentId,
          projectId: input.projectId,
          sessionFile: instance.metadata.pi.sessionFile,
          sessionId: header.id,
          cwd: header.cwd,
          ...(sessionName ? { sessionName } : {}),
          leafId: instance.sessionManager.getLeafId(),
          entries: instance.sessionManager.getEntries(),
        };
      },
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
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      return yield* new AgentNotFoundError({ agentId: input.agentId });
    }

    const instance = instanceOpt.value;
    yield* instance.setModel(input.model);
    instance.setThinkingLevel(input.thinkingLevel);
    return null;
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const getAgentFrontendConfigRpc = os.agent.getAgentFrontendConfig.handler(() =>
  Effect.gen(function* () {
    // Return defaults for now
    return {
      availableModels: [] as {
        provider: string;
        id: string;
        name: string;
        fullId: string;
      }[],
      defaultProvider: "openai",
      defaultModel: "gpt-4o",
      defaultThinkingLevel: "off" as const,
    };
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

// Streaming RPC - uses async generator pattern
export const promptAgentRpc = os.agent.promptAgent.handler(async function* ({ input }) {
  // Setup
  const instance = await Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

      if (Option.isNone(instanceOpt)) {
        return yield* new AgentNotFoundError({
          agentId: input.agentId,
          cause: "Agent not found or not initialized",
        });
      }

      return instanceOpt.value;
    }).pipe(Effect.provide(AgentService.layer)),
  );

  // Start prompt in background
  void instance.prompt(input.text);

  // Stream events directly from instance subscription
  const stream = instance.subscribe();

  try {
    for await (const event of Stream.toAsyncIterable(stream)) {
      yield event;

      if (
        event.type === "error" ||
        (event.type === "status_change" && (event.status === "idle" || event.status === "error"))
      ) {
        break;
      }
    }
  } finally {
    // Stream cleanup
  }
});

export const abortAgentRpc = os.agent.abortAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      return yield* new AgentNotFoundError({
        agentId: input.agentId,
        cause: "Agent not found",
      });
    }

    instanceOpt.value.abort();
    return null;
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const enqueueAgentPromptRpc = os.agent.enqueueAgentPrompt.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      return yield* new AgentNotFoundError({
        agentId: input.agentId,
        cause: "Agent not found",
      });
    }

    // Enqueue is same as immediate for now (Pi handles queuing internally)
    void instanceOpt.value.prompt(input.text);
    return null;
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);
