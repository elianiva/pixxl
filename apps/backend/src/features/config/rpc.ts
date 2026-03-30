import { Effect } from "effect";
import { ConfigService } from "./service";
import { os } from "@/contract";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

export const getConfigRpc = os.config.getConfig.handler(() =>
  Effect.gen(function* () {
    const service = yield* ConfigService;
    const config = yield* service.loadConfig();
    return config;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const updateConfigRpc = os.config.updateConfig.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ConfigService;
    const result = yield* service.updateConfig(input);
    return result;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
