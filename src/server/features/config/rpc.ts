import { os } from "@orpc/server";
import { Schema, Effect, Layer } from "effect";
import { ConfigSchema } from "./schema";
import { ConfigService } from "./service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";

const ConfigLayer = ConfigService.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
);

export const getConfigRpc = os
  .output(Schema.toStandardSchemaV1(ConfigSchema))
  .handler(() =>
    Effect.gen(function* () {
      const service = yield* ConfigService;
      const config = yield* service.loadConfig();
      return config;
    }).pipe(Effect.provide(ConfigLayer), Effect.runPromise),
  )
  .callable();

export const updateConfigRpc = os
  .input(Schema.toStandardSchemaV1(ConfigSchema))
  .output(Schema.toStandardSchemaV1(ConfigSchema))
  .handler(({ input }) =>
    Effect.gen(function* () {
      const service = yield* ConfigService;
      const result = yield* service.updateConfig(input);
      return result;
    }).pipe(Effect.provide(ConfigLayer), Effect.runPromise),
  )
  .callable();
