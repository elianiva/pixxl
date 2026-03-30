import { Effect, Option, Stream } from "effect";
import { os } from "@/contract";
import { AgentService } from "./service";
import { ConfigService } from "@/features/config/service";
import { runPromise } from "@/lib/error";
import { AgentNotFoundError } from "./error";

// Helper to unwrap Option to nullable for RPC responses
const toNullable = <T>(opt: Option.Option<T>): T | null =>
  Option.match(opt, { onSome: (x) => x, onNone: () => null });

export const getAgentRpc = os.agent.getAgent.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const result = yield* service.getAgent({ agentId: input.id });
      return toNullable(result);
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const createAgentRpc = os.agent.createAgent.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      return yield* service.createAgent(input);
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const updateAgentRpc = os.agent.updateAgent.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const result = yield* service.updateAgent(input);
      return toNullable(result);
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const deleteAgentRpc = os.agent.deleteAgent.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      yield* service.deleteAgent({ agentId: input.id });
      return true;
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const listAgentsRpc = os.agent.listAgents.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      return yield* service.listAgents({ projectId: input.projectId });
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const attachSessionRpc = os.agent.attachSession.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const result = yield* service.attachSession({
        agentId: input.agentId,
        sessionFile: input.sessionFile,
      });
      return toNullable(result);
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const switchSessionRpc = os.agent.switchSession.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const result = yield* service.attachSession({
        agentId: input.agentId,
        sessionFile: input.sessionFile,
      });
      return toNullable(result);
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const listAttachableSessionsRpc = os.agent.listAttachableSessions.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      return yield* service.listSessions({ projectId: input.projectId });
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const getAgentRuntimeRpc = os.agent.getAgentRuntime.handler(({ input }) =>
  runPromise(
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
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const getAgentHistoryRpc = os.agent.getAgentHistory.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

      return Option.match(instanceOpt, {
        onNone: () => null,
        onSome: (instance) => {
          const header = instance.sessionManager.getHeader();
          if (!header) return null;

          const sessionName = instance.sessionManager.getSessionName();
          const _entries = instance.sessionManager.getEntries();
          const leafId = instance.sessionManager.getLeafId();

          return {
            agentId: input.agentId,
            projectId: input.projectId,
            sessionFile: instance.metadata.pi.sessionFile,
            sessionId: header.id,
            cwd: header.cwd,
            sessionName,
            leafId,
            entries: _entries,
          };
        },
      });
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const getAgentUsageRpc = os.agent.getAgentUsage.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

      return Option.match(instanceOpt, {
        onNone: () => null,
        onSome: (instance) => {
          const entries = instance.sessionManager.getEntries();
          const leafId = instance.sessionManager.getLeafId();

          // Build parent map to trace path from leaf to root
          const parentMap = new Map<string, string>();
          for (const entry of entries) {
            if (entry.parentId) {
              parentMap.set(entry.id, entry.parentId);
            }
          }

          // Build set of IDs in the current branch path (from leaf to root)
          const branchIds = new Set<string>();
          let currentId: string | undefined = leafId ?? undefined;
          while (currentId) {
            branchIds.add(currentId);
            currentId = parentMap.get(currentId);
          }

          // Calculate usage only from entries in the current branch
          // Note: input/cacheRead represent the TOTAL context sent to API, so we
          // only take the maximum (latest message), not sum. Output is additive
          // since each message generates new tokens.
          let maxInput = 0;
          let maxCacheRead = 0;
          let maxCacheWrite = 0;
          let totalOutput = 0;
          let totalCost = 0;

          for (const entry of entries) {
            // Only count entries in the current branch path
            if (!branchIds.has(entry.id)) continue;

            if (entry.type === "message" && entry.message?.role === "assistant") {
              const msg = entry.message as {
                usage?: {
                  input?: number;
                  output?: number;
                  cacheRead?: number;
                  cacheWrite?: number;
                  cost?: { total?: number };
                };
              };
              if (msg.usage) {
                // Take max of input/cache since they represent total context
                maxInput = Math.max(maxInput, msg.usage.input ?? 0);
                maxCacheRead = Math.max(maxCacheRead, msg.usage.cacheRead ?? 0);
                maxCacheWrite = Math.max(maxCacheWrite, msg.usage.cacheWrite ?? 0);
                // Sum outputs (additive per message)
                totalOutput += msg.usage.output ?? 0;
                totalCost += msg.usage.cost?.total ?? 0;
              }
            }
          }

          const input = maxInput;
          const cacheRead = maxCacheRead;
          const cacheWrite = maxCacheWrite;
          const output = totalOutput;
          const totalTokens = input + output + cacheRead + cacheWrite;
          const contextWindow = instance.currentModel?.contextWindow;

          return {
            usage: {
              input,
              output,
              cacheRead,
              cacheWrite,
              totalTokens,
              cost: {
                input,
                output,
                cacheRead,
                cacheWrite,
                total: totalCost,
              },
            },
            contextWindow,
          };
        },
      });
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const configureAgentSessionRpc = os.agent.configureAgentSession.handler(({ input }) =>
  runPromise(
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
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const getAgentFrontendConfigRpc = os.agent.getAgentFrontendConfig.handler(() =>
  runPromise(
    Effect.gen(function* () {
      const configService = yield* ConfigService;
      const config = yield* configService.loadConfig();
      return {
        defaultProvider: config.agent.defaultProvider,
        defaultModel: config.agent.defaultModel,
        defaultThinkingLevel: config.agent.defaultThinkingLevel,
      };
    }).pipe(Effect.provide(ConfigService.live)),
  ),
);

export const listAvailableModelsRpc = os.agent.listAvailableModels.handler(() =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      return yield* service.listAvailableModels();
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const getAgentSessionDetailsRpc = os.agent.getAgentSessionDetails.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

      if (Option.isNone(instanceOpt)) {
        return null;
      }

      const instance = instanceOpt.value;
      const sessionManager = instance.sessionManager;

      // Get session metadata
      const header = sessionManager.getHeader();
      const sessionName = sessionManager.getSessionName();
      const leafId = sessionManager.getLeafId();
      const entries = sessionManager.getEntries();

      if (!header) {
        return null;
      }

      // Build parent map to trace path from leaf to root
      const parentMap = new Map<string, string>();
      for (const entry of entries) {
        if (entry.parentId) {
          parentMap.set(entry.id, entry.parentId);
        }
      }

      // Build set of IDs in the current branch path (from leaf to root)
      const branchIds = new Set<string>();
      let currentId: string | undefined = leafId ?? undefined;
      while (currentId) {
        branchIds.add(currentId);
        currentId = parentMap.get(currentId);
      }

      // Calculate stats from entries in current branch only
      // Note: input/cacheRead/cacheWrite represent TOTAL context sent to API,
      // so we take max (latest message). Output is summed (additive per message).
      let maxInput = 0;
      let maxCacheRead = 0;
      let maxCacheWrite = 0;
      let totalOutput = 0;
      let messageCount = 0;
      let toolCallCount = 0;
      let totalCost = 0;

      for (const entry of entries) {
        // Only count entries in the current branch path
        if (!branchIds.has(entry.id)) continue;

        if (entry.type === "message") {
          const msg = entry.message as {
            role?: string;
            usage?: {
              input?: number;
              output?: number;
              cacheRead?: number;
              cacheWrite?: number;
              cost?: { total?: number };
            };
          };
          if (msg.role === "assistant") {
            messageCount++;
            if (msg.usage) {
              // Take max of input/cache since they represent total context size
              maxInput = Math.max(maxInput, msg.usage.input ?? 0);
              maxCacheRead = Math.max(maxCacheRead, msg.usage.cacheRead ?? 0);
              maxCacheWrite = Math.max(maxCacheWrite, msg.usage.cacheWrite ?? 0);
              // Sum outputs (additive per message)
              totalOutput += msg.usage.output ?? 0;
              totalCost += msg.usage.cost?.total ?? 0;
            }
          }
        }
      }

      const totalTokens = maxInput + totalOutput + maxCacheRead + maxCacheWrite;

      // Build label lookup map from label entries (label entries reference targetId)
      const labelMap = new Map<string, string>();
      for (const entry of entries) {
        if (entry.type === "label") {
          const labelEntry = entry as { targetId: string; label?: string };
          if (labelEntry.label) {
            labelMap.set(labelEntry.targetId, labelEntry.label);
          }
        }
      }

      // Build tree structure
      const tree = entries.map((entry) => ({
        id: entry.id ?? "",
        parentId: entry.parentId ? String(entry.parentId) : undefined,
        role: (entry as { message?: { role?: string } }).message?.role ?? entry.type ?? "unknown",
        type: entry.type,
        label: labelMap.get(entry.id ?? ""),
        hasChildren: entries.some((e) => e.parentId === entry.id),
        isLeaf: entry.id === leafId,
      }));

      return {
        sessionFile: instance.metadata.pi.sessionFile,
        sessionId: header.id ?? "",
        sessionName,
        cwd: header.cwd ?? "",
        leafId: leafId ?? "",
        createdAt: header.timestamp,
        updatedAt: undefined,
        stats: {
          totalTokens,
          messageCount,
          toolCallCount,
          totalCost,
        },
        tree,
      };
    }).pipe(Effect.provide(AgentService.layer)),
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
  void instance.prompt(input.text, {
    userOptimisticId: input.userOptimisticId,
    assistantOptimisticId: input.assistantOptimisticId,
  });

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
  runPromise(
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
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const enqueueAgentPromptRpc = os.agent.enqueueAgentPrompt.handler(({ input }) =>
  runPromise(
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
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);
