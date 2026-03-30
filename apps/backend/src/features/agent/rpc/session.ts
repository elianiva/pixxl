import { Effect, Option } from "effect";
import { os } from "@/contract";
import { AgentService } from "../service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

const toNullable = <T>(opt: Option.Option<T>): T | null =>
  Option.match(opt, { onSome: (x) => x, onNone: () => null });

export const attachSessionRpc = os.agent.attachSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.attachSession({
      agentId: input.agentId,
      sessionFile: input.sessionFile,
    });
    return toNullable(result);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const switchSessionRpc = os.agent.switchSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.attachSession({
      agentId: input.agentId,
      sessionFile: input.sessionFile,
    });
    return toNullable(result);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const createSessionRpc = os.agent.createSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.createNewSession({
      agentId: input.agentId,
    });
    return toNullable(result);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const listAttachableSessionsRpc = os.agent.listAttachableSessions.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listSessions({ projectId: input.projectId });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
