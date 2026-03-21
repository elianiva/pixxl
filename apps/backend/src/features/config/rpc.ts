import { Effect, Layer } from "effect";
import { ConfigService } from "./service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { os } from "@/contract";

const ConfigLayer = ConfigService.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
);

export const getConfigRpc = os.config.getConfig.handler(() =>
  Effect.gen(function* () {
    const service = yield* ConfigService;
    const config = yield* service.loadConfig();
    return config;
  }).pipe(Effect.provide(ConfigLayer), Effect.runPromise),
);

export const updateConfigRpc = os.config.updateConfig.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ConfigService;
    const result = yield* service.updateConfig(input);
    return result;
  }).pipe(Effect.provide(ConfigLayer), Effect.runPromise),
);
