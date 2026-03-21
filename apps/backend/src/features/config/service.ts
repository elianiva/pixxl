import { BunFileSystem, BunPath } from "@effect/platform-bun";
import {
  AgentSchema,
  AppearanceSchema,
  AppConfig,
  DEFAULT_CONFIG,
  TerminalSchema,
  WorkspaceSchema,
} from "@pixxl/shared";
import { Config, Effect, FileSystem, Layer, Path, Schema, ServiceMap, Struct } from "effect";
import { AppConfigError, ConfigParseError, ConfigSerializeError } from "./error";

const APP_DIR = "pixxl";
const CONFIG_FILE = "config.json";

const PartialAppConfigSchema = Schema.Struct({
  workspace: Schema.optionalKey(WorkspaceSchema.mapFields(Struct.map(Schema.optionalKey))),
  terminal: Schema.optionalKey(TerminalSchema.mapFields(Struct.map(Schema.optionalKey))),
  agent: Schema.optionalKey(AgentSchema.mapFields(Struct.map(Schema.optionalKey))),
  appearance: Schema.optionalKey(AppearanceSchema.mapFields(Struct.map(Schema.optionalKey))),
});
type PartialAppConfig = typeof PartialAppConfigSchema.Type;

const mapToAppConfigError = (message: string) =>
  Effect.mapError((cause) => new AppConfigError({ message, cause }));

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
  readonly loadConfig: () => Effect.Effect<AppConfig, AppConfigError | ConfigParseError>;
  readonly saveConfig: (
    config: AppConfig,
  ) => Effect.Effect<void, AppConfigError | ConfigSerializeError>;
  readonly updateConfig: (
    partial: PartialAppConfig,
  ) => Effect.Effect<AppConfig, AppConfigError | ConfigSerializeError | ConfigParseError>;
  readonly configPath: string;
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

      const configDir = path.join(configBaseDir, APP_DIR);
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
          .pipe(mapToAppConfigError(`Failed to check if config directory exists at ${configDir}`));
        if (!dirExists) {
          yield* fs
            .makeDirectory(configDir, { recursive: true })
            .pipe(mapToAppConfigError(`Failed to create config directory at ${configDir}`));
        }

        const fileExists = yield* fs
          .exists(configPath)
          .pipe(mapToAppConfigError(`Failed to check if config file exists at ${configPath}`));
        if (!fileExists) {
          yield* fs
            .writeFileString(configPath, "{}")
            .pipe(mapToAppConfigError(`Failed to create config file at ${configPath}`));
          return DEFAULT_CONFIG;
        }

        const content = yield* fs
          .readFileString(configPath)
          .pipe(mapToAppConfigError(`Failed to read config file at ${configPath}`));

        if (content === "{}" || content === "") {
          return DEFAULT_CONFIG;
        }

        const userConfig = yield* decodeConfig(content).pipe(
          Effect.mapError(
            (cause) =>
              new ConfigParseError({
                message: "Invalid config file. Fix missing/invalid fields in config.json.",
                cause,
              }),
          ),
        );

        return deepMerge(DEFAULT_CONFIG as PartialAppConfig, userConfig) as AppConfig;
      });

      const saveConfig = Effect.fn("ConfigService.saveConfig")(function* (config: AppConfig) {
        const userConfig = deepPartial(DEFAULT_CONFIG, config);
        const isEmpty =
          Object.keys(userConfig).length === 0 &&
          Object.values(userConfig).every(
            (v) =>
              v === undefined || (typeof v === "object" && Object.keys(v as object).length === 0),
          );

        if (isEmpty) return;

        const json = yield* encodeConfig(userConfig).pipe(
          Effect.mapError(
            (cause) =>
              new ConfigSerializeError({
                message: "Failed to serialize config.json.",
                cause,
              }),
          ),
        );

        yield* fs
          .writeFileString(configPath, json)
          .pipe(mapToAppConfigError(`Failed to write config file at ${configPath}`));
      });

      const updateConfig = Effect.fn("ConfigService.updateConfig")(function* (
        partial: PartialAppConfig,
      ) {
        const current = yield* loadConfig();
        const merged = deepMerge(current, partial as AppConfig);
        yield* saveConfig(merged as AppConfig);
        return merged;
      });

      return { loadConfig, saveConfig, updateConfig, configPath } as const;
    }),
  },
) {
  static layer = Layer.effect(ConfigService, ConfigService.make);
  static live = ConfigService.layer.pipe(
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
