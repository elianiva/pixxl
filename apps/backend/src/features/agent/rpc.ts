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
      return yield* service.updateAgent(input);
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
      return yield* service.attachSession({
        agentId: input.agentId,
        sessionFile: input.sessionFile,
      });
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const switchSessionRpc = os.agent.switchSession.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      return yield* service.attachSession({
        agentId: input.agentId,
        sessionFile: input.sessionFile,
      });
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
          // Calculate usage from session entries - sum up all assistant message usage
          let input = 0;
          let output = 0;
          let cacheRead = 0;
          let cacheWrite = 0;
          let costTotal = 0;

          for (const entry of instance.sessionManager.getEntries()) {
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
                input += msg.usage.input ?? 0;
                output += msg.usage.output ?? 0;
                cacheRead += msg.usage.cacheRead ?? 0;
                cacheWrite += msg.usage.cacheWrite ?? 0;
                costTotal += msg.usage.cost?.total ?? 0;
              }
            }
          }

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
                total: costTotal,
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

      // Calculate stats from entries
      let totalTokens = 0;
      let messageCount = 0;
      let toolCallCount = 0;
      let totalCost = 0;

      for (const entry of entries) {
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
              totalTokens +=
                (msg.usage.input ?? 0) +
                (msg.usage.output ?? 0) +
                (msg.usage.cacheRead ?? 0) +
                (msg.usage.cacheWrite ?? 0);
              totalCost += msg.usage.cost?.total ?? 0;
            }
          }
        }
      }

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
