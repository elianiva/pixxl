import { Effect } from "effect";
import { os } from "@/contract";
import { AgentService } from "../service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

export const getAgentFrontendConfigRpc = os.agent.getAgentFrontendConfig.handler(() =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const settings = yield* service.getPiSettings;
    return {
      defaultProvider: settings.defaultProvider ?? "",
      defaultModel: settings.defaultModel ?? "",
      defaultThinkingLevel: settings.defaultThinkingLevel ?? "medium",
      transport: settings.transport ?? "websocket",
      steeringMode: settings.steeringMode ?? "one-at-a-time",
      followUpMode: settings.followUpMode ?? "one-at-a-time",
      theme: settings.theme,
      hideThinkingBlock: settings.hideThinkingBlock ?? false,
      shellPath: settings.shellPath,
      shellCommandPrefix: settings.shellCommandPrefix,
      enableSkillCommands: settings.enableSkillCommands ?? true,
      doubleEscapeAction: settings.doubleEscapeAction ?? "tree",
      treeFilterMode: settings.treeFilterMode ?? "default",
      enabledModels: settings.enabledModels,
      sessionDir: settings.sessionDir,
    };
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const listAvailableModelsRpc = os.agent.listAvailableModels.handler(() =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listAvailableModels();
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
