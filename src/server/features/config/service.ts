import { Effect, Layer, ServiceMap, FileSystem, Path, Config, type PlatformError } from "effect";
import { DEFAULT_CONFIG, type Config as ConfigType } from "./schema";

const APP_DIR = "pixxl";
const CONFIG_FILE = "config.json";

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
  readonly loadConfig: () => Effect.Effect<ConfigType, PlatformError.PlatformError>;
  readonly saveConfig: (config: ConfigType) => Effect.Effect<void, PlatformError.PlatformError>;
  readonly updateConfig: (
    partial: Partial<ConfigType>,
  ) => Effect.Effect<ConfigType, PlatformError.PlatformError>;
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
        const userConfig = JSON.parse(content) as Partial<ConfigType>;
        return deepMerge(DEFAULT_CONFIG, userConfig);
      });

      const saveConfig = Effect.fn("ConfigService.saveConfig")(function* (config: ConfigType) {
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

        yield* fs.writeFileString(configPath, JSON.stringify(userConfig, null, 2));
      });

      const updateConfig = Effect.fn("ConfigService.updateConfig")(function* (
        partial: Partial<ConfigType>,
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
