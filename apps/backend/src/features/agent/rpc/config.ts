import { Effect, Option } from "effect";
import { os } from "@/contract";
import { AgentService } from "../service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";
import { AgentNotFoundError } from "../error";

export const configureAgentSessionRpc = os.agent.configureAgentSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      return yield* new AgentNotFoundError({ agentId: input.agentId });
    }

    const instance = instanceOpt.value;
    const currentModel = instance.currentModel;

    const modelChanged =
      !currentModel ||
      currentModel.provider !== input.model.provider ||
      currentModel.id !== input.model.id;

    if (modelChanged) {
      yield* Effect.promise(() => instance.setModel(input.model));
    }

    if (instance.thinkingLevel !== input.thinkingLevel) {
      instance.setThinkingLevel(input.thinkingLevel);
    }

    return null;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const setAgentModelRpc = os.agent.setAgentModel.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      return yield* new AgentNotFoundError({ agentId: input.agentId });
    }

    const instance = instanceOpt.value;
    const currentModel = instance.currentModel;

    const modelChanged =
      !currentModel ||
      currentModel.provider !== input.model.provider ||
      currentModel.id !== input.model.id;

    if (modelChanged) {
      yield* Effect.promise(() => instance.setModel(input.model));
    }

    return null;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const setAgentThinkingLevelRpc = os.agent.setAgentThinkingLevel.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const instanceOpt = yield* service.getInstance({ agentId: input.agentId });

    if (Option.isNone(instanceOpt)) {
      return yield* new AgentNotFoundError({ agentId: input.agentId });
    }

    const instance = instanceOpt.value;
    if (instance.thinkingLevel !== input.thinkingLevel) {
      instance.setThinkingLevel(input.thinkingLevel);
    }

    return null;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
