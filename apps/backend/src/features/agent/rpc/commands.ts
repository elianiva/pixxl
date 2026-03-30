import { Effect, Option } from "effect";
import { os } from "@/contract";
import { AgentService } from "../service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";
import { AgentNotFoundError } from "../error";

export const promptAgentRpc = os.agent.promptAgent.handler(({ input }) =>
  Effect.gen(function* () {
    console.log("[PROMPT-RPC] Handler called for agent:", input.agentId);
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      console.log("[PROMPT-RPC] Agent not found");
      return yield* new AgentNotFoundError({
        agentId: input.agentId,
        cause: "Agent not found or not initialized",
      });
    }

    console.log("[PROMPT-RPC] Got instance, calling prompt...");
    // Fire-and-forget, but catch errors so they don't go unhandled
    instanceOpt.value.prompt(input.text).catch((err) => {
      console.error("[PROMPT-RPC] prompt() rejected:", err);
    });
    console.log("[PROMPT-RPC] Prompt started (fire-and-forget)");
    return null;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
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

    void instanceOpt.value.prompt(input.text);
    return null;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

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
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
