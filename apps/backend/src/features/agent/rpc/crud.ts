import { Effect, Option } from "effect";
import { os } from "@/contract";
import { AgentService } from "../service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

const toNullable = <T>(opt: Option.Option<T>): T | null =>
  Option.match(opt, { onSome: (x) => x, onNone: () => null });

export const getAgentRpc = os.agent.getAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.getAgent({ agentId: input.id });
    return toNullable(result);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const createAgentRpc = os.agent.createAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.createAgent(input);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const updateAgentRpc = os.agent.updateAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.updateAgent(input);
    return toNullable(result);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const deleteAgentRpc = os.agent.deleteAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    yield* service.deleteAgent({ agentId: input.id });
    return true;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const listAgentsRpc = os.agent.listAgents.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listAgents({ projectId: input.projectId });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
