import { Config, Effect, Layer, ServiceMap } from "effect";
import { SettingsManager } from "@mariozechner/pi-coding-agent";
import type { PiSettings, PiPartialSettings } from "@pixxl/shared";
import { BunFileSystem, BunPath } from "@effect/platform-bun";

const PI_AGENT_DIR = ".pi/agent";

export class PiSettingsService extends ServiceMap.Service<PiSettingsService>()(
  "@pixxl/PiSettingsService",
  {
    make: Effect.gen(function* () {
      const homeDir = yield* Config.string("HOME").pipe(Config.withDefault("~"));
      const agentDir = `${homeDir}/${PI_AGENT_DIR}`;

      // Create SettingsManager that loads from pi's config files
      // We use current working directory as undefined to load global settings
      const settingsManager = SettingsManager.create(undefined, agentDir);

      const getSettings = Effect.sync(() => {
        const settings: PiSettings = {
          defaultProvider: settingsManager.getDefaultProvider(),
          defaultModel: settingsManager.getDefaultModel(),
          defaultThinkingLevel: settingsManager.getDefaultThinkingLevel(),
          transport: settingsManager.getTransport(),
          steeringMode: settingsManager.getSteeringMode(),
          followUpMode: settingsManager.getFollowUpMode(),
          theme: settingsManager.getTheme(),
          compaction: settingsManager.getCompactionSettings(),
          retry: settingsManager.getRetrySettings(),
          hideThinkingBlock: settingsManager.getHideThinkingBlock(),
          shellPath: settingsManager.getShellPath(),
          shellCommandPrefix: settingsManager.getShellCommandPrefix(),
          enableSkillCommands: settingsManager.getEnableSkillCommands(),
          terminal: {
            showImages: settingsManager.getShowImages(),
            clearOnShrink: settingsManager.getClearOnShrink(),
          },
          images: {
            autoResize: settingsManager.getImageAutoResize(),
            blockImages: settingsManager.getBlockImages(),
          },
          markdown: {
            codeBlockIndent: settingsManager.getCodeBlockIndent(),
          },
          skills: settingsManager.getSkillPaths(),
          prompts: settingsManager.getPromptTemplatePaths(),
          themes: settingsManager.getThemePaths(),
          doubleEscapeAction: settingsManager.getDoubleEscapeAction(),
          treeFilterMode: settingsManager.getTreeFilterMode(),
          thinkingBudgets: settingsManager.getThinkingBudgets(),
          packages: settingsManager.getPackages(),
          extensions: settingsManager.getExtensionPaths(),
          enabledModels: settingsManager.getEnabledModels(),
          sessionDir: settingsManager.getSessionDir(),
        };
        return settings;
      });

      const updateSettings = Effect.fn("PiSettingsService.updateSettings")(function* (
        partial: PiPartialSettings,
      ) {
        // Apply settings using individual setters
        if (partial.defaultProvider !== undefined) {
          settingsManager.setDefaultProvider(partial.defaultProvider);
        }
        if (partial.defaultModel !== undefined) {
          settingsManager.setDefaultModel(partial.defaultModel);
        }
        if (partial.defaultThinkingLevel !== undefined) {
          settingsManager.setDefaultThinkingLevel(partial.defaultThinkingLevel);
        }
        if (partial.transport !== undefined) {
          settingsManager.setTransport(partial.transport);
        }
        if (partial.steeringMode !== undefined) {
          settingsManager.setSteeringMode(partial.steeringMode);
        }
        if (partial.followUpMode !== undefined) {
          settingsManager.setFollowUpMode(partial.followUpMode);
        }
        if (partial.theme !== undefined) {
          settingsManager.setTheme(partial.theme);
        }
        if (partial.compaction !== undefined) {
          if (partial.compaction.enabled !== undefined) {
            settingsManager.setCompactionEnabled(partial.compaction.enabled);
          }
          // Note: compaction settings use individual getters but not individual setters
          // We'll need to use applyOverrides for nested settings
        }
        if (partial.retry !== undefined) {
          if (partial.retry.enabled !== undefined) {
            settingsManager.setRetryEnabled(partial.retry.enabled);
          }
        }
        if (partial.hideThinkingBlock !== undefined) {
          settingsManager.setHideThinkingBlock(partial.hideThinkingBlock);
        }
        if (partial.shellPath !== undefined) {
          settingsManager.setShellPath(partial.shellPath || undefined);
        }
        if (partial.shellCommandPrefix !== undefined) {
          settingsManager.setShellCommandPrefix(partial.shellCommandPrefix || undefined);
        }
        if (partial.enableSkillCommands !== undefined) {
          settingsManager.setEnableSkillCommands(partial.enableSkillCommands);
        }
        if (partial.terminal !== undefined) {
          if (partial.terminal.showImages !== undefined) {
            settingsManager.setShowImages(partial.terminal.showImages);
          }
          if (partial.terminal.clearOnShrink !== undefined) {
            settingsManager.setClearOnShrink(partial.terminal.clearOnShrink);
          }
        }
        if (partial.images !== undefined) {
          if (partial.images.autoResize !== undefined) {
            settingsManager.setImageAutoResize(partial.images.autoResize);
          }
          if (partial.images.blockImages !== undefined) {
            settingsManager.setBlockImages(partial.images.blockImages);
          }
        }
        if (partial.markdown !== undefined) {
          if (partial.markdown.codeBlockIndent !== undefined) {
            // Note: getCodeBlockIndent exists but no setter - using applyOverrides
          }
        }
        if (partial.skills !== undefined) {
          settingsManager.setSkillPaths(partial.skills);
        }
        if (partial.prompts !== undefined) {
          settingsManager.setPromptTemplatePaths(partial.prompts);
        }
        if (partial.themes !== undefined) {
          settingsManager.setThemePaths(partial.themes);
        }
        if (partial.doubleEscapeAction !== undefined) {
          settingsManager.setDoubleEscapeAction(partial.doubleEscapeAction);
        }
        if (partial.treeFilterMode !== undefined) {
          settingsManager.setTreeFilterMode(partial.treeFilterMode);
        }
        if (partial.thinkingBudgets !== undefined) {
          // Note: getThinkingBudgets exists but no setter - using applyOverrides
        }
        if (partial.packages !== undefined) {
          settingsManager.setPackages(partial.packages);
        }
        if (partial.extensions !== undefined) {
          settingsManager.setExtensionPaths(partial.extensions);
        }
        if (partial.enabledModels !== undefined) {
          settingsManager.setEnabledModels(partial.enabledModels);
        }
        if (partial.sessionDir !== undefined) {
          // Note: getSessionDir exists but no setter - using applyOverrides
        }

        // For settings without individual setters, use applyOverrides
        // Build the overrides object with only the settings that need it
        const overrides: Partial<PiSettings> = {};

        if (partial.compaction !== undefined) {
          // @ts-expect-error: partial check
          overrides.compaction = partial.compaction;
        }
        if (partial.retry !== undefined) {
          // @ts-expect-error: partial check
          overrides.retry = partial.retry;
        }
        if (partial.markdown !== undefined && partial.markdown.codeBlockIndent !== undefined) {
          // @ts-expect-error: partial check
          overrides.markdown = partial.markdown;
        }
        if (partial.thinkingBudgets !== undefined) {
          // @ts-expect-error: partial check
          overrides.thinkingBudgets = partial.thinkingBudgets;
        }
        if (partial.sessionDir !== undefined) {
          // @ts-expect-error: partial check
          overrides.sessionDir = partial.sessionDir;
        }

        if (Object.keys(overrides).length > 0) {
          // @ts-expect-error: Settings interface
          settingsManager.applyOverrides(overrides);
        }

        // Flush settings to disk
        yield* Effect.promise(() => settingsManager.flush());

        // Reload and return updated settings
        settingsManager.reload();
        return yield* getSettings;
      });

      return { getSettings, updateSettings } as const;
    }),
  },
) {
  static layer = Layer.effect(PiSettingsService, PiSettingsService.make).pipe(
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
