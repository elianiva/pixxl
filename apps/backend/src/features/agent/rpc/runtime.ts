import { Effect, Option } from "effect";
import { os } from "@/contract";
import { AgentService } from "../service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

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
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
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
        const entries = instance.sessionManager.getEntries();
        const leafId = instance.sessionManager.getLeafId();

        return {
          agentId: input.agentId,
          projectId: input.projectId,
          sessionFile: instance.metadata.pi.sessionFile,
          sessionId: header.id,
          cwd: header.cwd,
          sessionName,
          leafId,
          entries,
        };
      },
    });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const getAgentUsageRpc = os.agent.getAgentUsage.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    return Option.match(instanceOpt, {
      onNone: () => null,
      onSome: (instance) => {
        const entries = instance.sessionManager.getEntries();
        const leafId = instance.sessionManager.getLeafId();

        const parentMap = new Map<string, string>();
        for (const entry of entries) {
          if (entry.parentId) {
            parentMap.set(entry.id, entry.parentId);
          }
        }

        const branchIds = new Set<string>();
        let currentId: string | undefined = leafId ?? undefined;
        while (currentId) {
          branchIds.add(currentId);
          currentId = parentMap.get(currentId);
        }

        let maxInput = 0;
        let maxCacheRead = 0;
        let maxCacheWrite = 0;
        let totalOutput = 0;
        let totalCost = 0;

        for (const entry of entries) {
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
              maxInput = Math.max(maxInput, msg.usage.input ?? 0);
              maxCacheRead = Math.max(maxCacheRead, msg.usage.cacheRead ?? 0);
              maxCacheWrite = Math.max(maxCacheWrite, msg.usage.cacheWrite ?? 0);
              totalOutput += msg.usage.output ?? 0;
              totalCost += msg.usage.cost?.total ?? 0;
            }
          }
        }

        const totalTokens = maxInput + maxCacheRead;
        const contextWindow = instance.currentModel?.contextWindow;

        return {
          usage: {
            input: maxInput,
            output: totalOutput,
            cacheRead: maxCacheRead,
            cacheWrite: maxCacheWrite,
            totalTokens,
            cost: {
              input: maxInput,
              output: totalOutput,
              cacheRead: maxCacheRead,
              cacheWrite: maxCacheWrite,
              total: totalCost,
            },
          },
          contextWindow,
        };
      },
    });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const getAgentSessionDetailsRpc = os.agent.getAgentSessionDetails.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      return null;
    }

    const instance = instanceOpt.value;
    const sessionManager = instance.sessionManager;

    const header = sessionManager.getHeader();
    const sessionName = sessionManager.getSessionName();
    const leafId = sessionManager.getLeafId();
    const entries = sessionManager.getEntries();

    if (!header) {
      return null;
    }

    const parentMap = new Map<string, string>();
    for (const entry of entries) {
      if (entry.parentId) {
        parentMap.set(entry.id, entry.parentId);
      }
    }

    const branchIds = new Set<string>();
    let currentId: string | undefined = leafId ?? undefined;
    while (currentId) {
      branchIds.add(currentId);
      currentId = parentMap.get(currentId);
    }

    let maxInput = 0;
    let maxCacheRead = 0;
    let messageCount = 0;
    let totalCost = 0;

    for (const entry of entries) {
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
            maxInput = Math.max(maxInput, msg.usage.input ?? 0);
            maxCacheRead = Math.max(maxCacheRead, msg.usage.cacheRead ?? 0);
            totalCost += msg.usage.cost?.total ?? 0;
          }
        }
      }
    }

    const totalTokens = maxInput + maxCacheRead;

    const labelMap = new Map<string, string>();
    for (const entry of entries) {
      if (entry.type === "label") {
        const labelEntry = entry as { targetId: string; label?: string };
        if (labelEntry.label) {
          labelMap.set(labelEntry.targetId, labelEntry.label);
        }
      }
    }

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
        toolCallCount: 0,
        totalCost,
      },
      tree,
    };
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
