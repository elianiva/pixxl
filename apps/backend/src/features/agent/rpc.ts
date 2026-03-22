import { Effect } from "effect";
import { os } from "@/contract";
import { AgentService } from "./service";

export const createAgentRpc = os.agent.createAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.createAgent(input);
  }).pipe(Effect.provide(AgentService.live), Effect.runPromise),
);

export const updateAgentRpc = os.agent.updateAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.updateAgent(input);
  }).pipe(Effect.provide(AgentService.live), Effect.runPromise),
);

export const listAgentsRpc = os.agent.listAgents.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listAgents(input);
  }).pipe(Effect.provide(AgentService.live), Effect.runPromise),
);
