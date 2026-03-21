import {
  AgentSchema,
  AppearanceSchema,
  AppConfig,
  DEFAULT_CONFIG,
  TerminalSchema,
  WorkspaceSchema,
} from "@pixxl/shared";
import { Config, Effect, FileSystem, Layer, Path, Schema, ServiceMap, Struct } from "effect";

const APP_DIR = "pixxl";
const CONFIG_FILE = "config.json";

const PartialAppConfigSchema = Schema.Struct({
  workspace: Schema.optionalKey(WorkspaceSchema.mapFields(Struct.map(Schema.optionalKey))),
  terminal: Schema.optionalKey(TerminalSchema.mapFields(Struct.map(Schema.optionalKey))),
  agent: Schema.optionalKey(AgentSchema.mapFields(Struct.map(Schema.optionalKey))),
  appearance: Schema.optionalKey(AppearanceSchema.mapFields(Struct.map(Schema.optionalKey))),
});

export class ConfigParseError extends Schema.TaggedErrorClass<ConfigParseError>()(
  "ConfigParseError",
  {
    message: Schema.String,
    details: Schema.String,
  },
) {}

export class ConfigSerializeError extends Schema.TaggedErrorClass<ConfigSerializeError>()(
  "ConfigSerializeError",
  {
    message: Schema.String,
    details: Schema.String,
  },
) {}

export type ConfigServiceError = ConfigParseError | ConfigSerializeError;

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

function toParseError(error: unknown): ConfigParseError {
  return new ConfigParseError({
    message: "Invalid config file. Fix missing/invalid fields in config.json.",
    details: formatError(error),
  });
}

function toSerializeError(error: unknown): ConfigSerializeError {
  return new ConfigSerializeError({
    message: "Failed to serialize config.json.",
    details: formatError(error),
  });
}

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
  readonly loadConfig: () => Effect.Effect<AppConfig, ConfigServiceError>;
  readonly saveConfig: (config: AppConfig) => Effect.Effect<void, ConfigServiceError>;
  readonly updateConfig: (
    partial: Partial<AppConfig>,
  ) => Effect.Effect<AppConfig, ConfigServiceError>;
  readonly configPath: string;
};

export class ConfigService extends ServiceMap.Service<ConfigService, ConfigServiceShape>()(
  "@pixxl/ConfigService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pathModule = yield* Path.Path;
      const configBaseDir = yield* Config.string("XDG_CONFIG_HOME").pipe(
        Config.withDefault(`${process.env.HOME}/.config`),
      );

      const configDir = pathModule.join(configBaseDir, APP_DIR);
      const configPath = pathModule.join(configDir, CONFIG_FILE);

      const decodeConfig = Schema.decodeUnknownEffect(
        Schema.fromJsonString(PartialAppConfigSchema),
      );
      const encodeConfig = Schema.encodeUnknownEffect(
        Schema.fromJsonString(PartialAppConfigSchema),
      );

      const loadConfig = Effect.fn("ConfigService.loadConfig")(function* () {
        const dirExists = yield* fs.exists(configDir);
        if (!dirExists) {
          yield* fs.makeDirectory(configDir, { recursive: true });
        }

        const fileExists = yield* fs.exists(configPath);
        if (!fileExists) {
          yield* fs.writeFileString(configPath, "{}");
          return DEFAULT_CONFIG;
        }

        const content = yield* fs.readFileString(configPath);

        if (content === "{}" || content === "") {
          return DEFAULT_CONFIG;
        }

        const userConfig = yield* decodeConfig(content).pipe(Effect.mapError(toParseError));

        return deepMerge(DEFAULT_CONFIG, userConfig);
      });

      const saveConfig = Effect.fn("ConfigService.saveConfig")(function* (config: AppConfig) {
        const userConfig = deepPartial(DEFAULT_CONFIG, config);
        const isEmpty =
          Object.keys(userConfig).length === 0 &&
          Object.values(userConfig).every(
            (v) =>
              v === undefined || (typeof v === "object" && Object.keys(v as object).length === 0),
          );

        if (isEmpty) {
          return;
        }

        const json = yield* encodeConfig(userConfig).pipe(Effect.mapError(toSerializeError));
        yield* fs.writeFileString(configPath, json);
      });

      const updateConfig = Effect.fn("ConfigService.updateConfig")(function* (
        partial: Partial<AppConfig>,
      ) {
        const current = yield* loadConfig();
        const merged = deepMerge(current, partial);
        yield* saveConfig(merged);
        return merged;
      });

      return { loadConfig, saveConfig, updateConfig, configPath } as const;
    }),
  },
) {
  static layer = Layer.effect(ConfigService, ConfigService.make);
}
