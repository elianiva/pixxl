import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { AppConfig, DEFAULT_CONFIG, PartialAppConfigSchema } from "@pixxl/shared";
import { Config, Effect, FileSystem, Layer, Path, Schema, ServiceMap } from "effect";
import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigSerializeError,
  ConfigValidationError,
} from "./error";

const APP_DIR = "pixxl";
const CONFIG_FILE = "config.json";
const PI_AGENT_DIR = ".pi/agent";

type PartialAppConfig = typeof PartialAppConfigSchema.Type;

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target } as Record<string, unknown>;
  for (const key in source) {
    const sourceValue = source[key];
    if (sourceValue !== undefined) {
      const targetValue = target[key];
      if (isObject(targetValue) && isObject(sourceValue)) {
        output[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else {
        output[key] = sourceValue;
      }
    }
  }
  return output as T;
}

function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}

function deepPartial<T extends object>(target: T, source: Partial<T>): Partial<T> {
  const output: Partial<T> = {};

  for (const key in target) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (isObject(targetValue) && isObject(sourceValue)) {
      const merged = deepPartial(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
      if (Object.keys(merged).length > 0) {
        (output as Record<string, unknown>)[key] = merged;
      }
    } else if (sourceValue !== targetValue) {
      (output as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return output;
}

type ConfigServiceShape = {
  readonly loadConfig: () => Effect.Effect<
    AppConfig,
    ConfigNotFoundError | ConfigParseError | ConfigValidationError
  >;
  readonly saveConfig: (config: AppConfig) => Effect.Effect<void, ConfigSerializeError>;
  readonly updateConfig: (
    partial: PartialAppConfig,
  ) => Effect.Effect<AppConfig, ConfigNotFoundError | ConfigParseError | ConfigSerializeError>;
  readonly configPath: string;
  readonly agentDir: string;
};

export class ConfigService extends ServiceMap.Service<ConfigService, ConfigServiceShape>()(
  "@pixxl/ConfigService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const configBaseDir = yield* Config.string("XDG_CONFIG_HOME").pipe(
        Config.withDefault(`${process.env.HOME}/.config`),
      );

      const homeDir = yield* Config.string("HOME").pipe(Config.withDefault("~"));
      const configDir = path.join(configBaseDir, APP_DIR);
      const agentDir = path.join(homeDir, PI_AGENT_DIR);
      const configPath = path.join(configDir, CONFIG_FILE);

      const decodeConfig = Schema.decodeUnknownEffect(
        Schema.fromJsonString(PartialAppConfigSchema),
      );
      const encodeConfig = Schema.encodeUnknownEffect(
        Schema.fromJsonString(PartialAppConfigSchema),
      );

      const loadConfig = Effect.fn("ConfigService.loadConfig")(function* () {
        const dirExists = yield* fs
          .exists(configDir)
          .pipe(Effect.mapError(() => new ConfigNotFoundError({ configPath: configDir })));

        if (!dirExists) {
          yield* fs
            .makeDirectory(configDir, { recursive: true })
            .pipe(Effect.mapError(() => new ConfigNotFoundError({ configPath: configDir })));
        }

        const fileExists = yield* fs
          .exists(configPath)
          .pipe(Effect.mapError(() => new ConfigNotFoundError({ configPath })));

        if (!fileExists) {
          yield* fs
            .writeFileString(configPath, "{}")
            .pipe(Effect.mapError(() => new ConfigNotFoundError({ configPath })));
          return DEFAULT_CONFIG;
        }

        const content = yield* fs
          .readFileString(configPath)
          .pipe(Effect.mapError(() => new ConfigNotFoundError({ configPath })));

        if (content === "{}" || content === "") {
          return DEFAULT_CONFIG;
        }

        const userConfig = yield* decodeConfig(content).pipe(
          Effect.mapError(
            (e) =>
              new ConfigParseError({
                configPath,
                rawContent: content,
                parseIssue: e instanceof Error ? e.message : String(e),
              }),
          ),
        );

        const merged = deepMerge(DEFAULT_CONFIG as PartialAppConfig, userConfig) as AppConfig;

        return merged;
      });

      const saveConfig = Effect.fn("ConfigService.saveConfig")(function* (config: AppConfig) {
        const userConfig = deepPartial(
          DEFAULT_CONFIG,
          config as Partial<AppConfig>,
        ) as PartialAppConfig;
        const isEmpty =
          Object.keys(userConfig).length === 0 &&
          Object.values(userConfig).every(
            (v) =>
              v === undefined || (typeof v === "object" && Object.keys(v as object).length === 0),
          );

        if (isEmpty) return;

        const json = yield* encodeConfig(userConfig).pipe(
          Effect.mapError(
            () =>
              new ConfigSerializeError({
                configPath,
                data: userConfig,
              }),
          ),
        );

        yield* fs.writeFileString(configPath, json).pipe(
          Effect.mapError(
            () =>
              new ConfigSerializeError({
                configPath,
                data: json,
              }),
          ),
        );
      });

      const updateConfig = Effect.fn("ConfigService.updateConfig")(function* (
        partial: PartialAppConfig,
      ) {
        const current = yield* loadConfig();
        const merged = deepMerge(current, partial as AppConfig);
        yield* saveConfig(merged as AppConfig);
        return merged;
      });

      return { loadConfig, saveConfig, updateConfig, configPath, agentDir } as const;
    }),
  },
) {
  static layer = Layer.effect(ConfigService, ConfigService.make);
  static live = ConfigService.layer.pipe(
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
