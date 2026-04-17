import { Effect, Layer, Option, ServiceMap, FileSystem, Schedule } from "effect";
import * as SynchronizedRef from "effect/SynchronizedRef";
import type {
  AgentMetadata,
  CreateAgentInput,
  UpdateAgentInput,
  PiSettings,
  PiPartialSettings,
} from "@pixxl/shared";
import { AgentMetadataSchema, EntityService } from "@pixxl/shared";
import type { PackageSource } from "@pixxl/shared";
import {
  SessionManager,
  createAgentSession,
  ModelRegistry,
  SettingsManager,
  DefaultResourceLoader,
} from "@mariozechner/pi-coding-agent";
import { AuthStorage } from "@mariozechner/pi-coding-agent";
import type { SessionInfo } from "@mariozechner/pi-coding-agent";
import { AgentCreateError, AgentUpdateError, AgentDeleteError } from "./error";
import { AgentInstance } from "./instance";
import { ConfigService } from "@/features/config/service";
import { ProjectService } from "@/features/project/service";

export class AgentService extends ServiceMap.Service<AgentService>()("@pixxl/AgentService", {
  make: Effect.gen(function* () {
    const entity = yield* EntityService;
    const project = yield* ProjectService;
    const fs = yield* FileSystem.FileSystem;
    const config = yield* ConfigService;

    const authStorage = AuthStorage.create();
    const modelRegistry = ModelRegistry.inMemory(authStorage);

    // Pi settings manager (shared across all agents)
    const PI_AGENT_DIR = ".pi/agent";
    const homeDir = process.env.HOME ?? "~";
    const agentDir = `${homeDir}/${PI_AGENT_DIR}`;
    const settingsManager = SettingsManager.create(undefined, agentDir);

    const instancesRef = yield* SynchronizedRef.make(new Map<string, AgentInstance>());

    const agents = entity.forEntity<AgentMetadata, CreateAgentInput, UpdateAgentInput>({
      directoryName: "agents",
      schema: AgentMetadataSchema,
      create: ({ id, now, name, projectId, sessionFile }) => ({
        id,
        projectId,
        name,
        createdAt: now,
        updatedAt: now,
        pi: { sessionFile: sessionFile ?? "" },
      }),
      update: (current, { name, sessionFile, now }) => ({
        ...current,
        name,
        updatedAt: now,
        pi: {
          ...current.pi,
          ...(sessionFile ? { sessionFile } : {}),
        },
      }),
    });

    const createAgent = Effect.fn("AgentService.createAgent")(function* (input: CreateAgentInput) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });
      if (Option.isNone(projectResult)) {
        return yield* new AgentCreateError({
          name: input.name,
          cause: new Error("Project not found"),
        });
      }
      const storagePath = yield* project.resolveStoragePath(projectResult.value.path);

      const metadata = yield* agents
        .create({
          id: input.id,
          name: input.name,
          projectId: input.projectId,
          entityBasePath: storagePath,
          sessionFile: "",
        })
        .pipe(Effect.mapError((cause) => new AgentCreateError({ name: input.name, cause })));

      return metadata;
    });

    const ensureSessionFile = Effect.fn("AgentService.ensureSessionFile")(function* (
      sessionFile: string,
      agentName: string,
    ) {
      const exists = yield* fs.exists(sessionFile).pipe(
        Effect.mapError((cause) => new AgentCreateError({ name: agentName, cause })),
      );
      if (exists) return true;

      yield* fs.writeFileString(sessionFile, "").pipe(
        Effect.mapError((cause) => new AgentCreateError({ name: agentName, cause })),
      );

      const verified = yield* fs.exists(sessionFile).pipe(
        Effect.mapError((cause) => new AgentCreateError({ name: agentName, cause })),
      );

      if (!verified) {
        return yield* new AgentCreateError({
          name: agentName,
          cause: "Session file creation failed verification",
        });
      }

      return true;
    });

    const buildInstance = Effect.fn("AgentService.buildInstance")(function* (input: {
      metadata: AgentMetadata;
      entityBasePath: string;
      projectPath: string;
    }) {
      const agentDir = config.agentDir;
      const settingsManager = SettingsManager.create(undefined, agentDir);

      let sessionFile = input.metadata.pi.sessionFile;
      let sessionManager: SessionManager;
      let metadata = input.metadata;

      if (!sessionFile) {
        sessionManager = SessionManager.create(input.projectPath);
        const sessionId = sessionManager.newSession();
        if (!sessionId) {
          return yield* new AgentCreateError({
            name: input.metadata.name,
            cause: "Failed to create session",
          });
        }
        const newSessionFile = sessionManager.getSessionFile();
        if (!newSessionFile) {
          return yield* new AgentCreateError({
            name: input.metadata.name,
            cause: "SessionManager did not return file path",
          });
        }
        sessionFile = newSessionFile;

        const updatedMetadataOpt = yield* agents.update({
          id: input.metadata.id,
          name: input.metadata.name,
          projectId: input.metadata.projectId,
          entityBasePath: input.entityBasePath,
          sessionFile,
        });

        if (Option.isNone(updatedMetadataOpt)) {
          return yield* new AgentCreateError({
            name: input.metadata.name,
            cause: "Failed to update agent metadata with new session file",
          });
        }

        metadata = updatedMetadataOpt.value;
      } else {
        yield* ensureSessionFile(sessionFile, input.metadata.name).pipe(
          Effect.retry({
            schedule: Schedule.exponential("50 millis"),
            times: 3,
            until: (err) => err._tag !== "AgentCreateError",
          }),
        );
        sessionManager = SessionManager.open(sessionFile);
      }

      const resourceLoader = new DefaultResourceLoader({
        cwd: input.projectPath,
        agentDir,
        settingsManager,
      });

      yield* Effect.promise(() => resourceLoader.reload());

      const result = yield* Effect.tryPromise({
        try: () =>
          createAgentSession({
            sessionManager,
            authStorage,
            modelRegistry,
            settingsManager,
            resourceLoader,
          }),
        catch: (cause) =>
          new AgentCreateError({
            name: input.metadata.name,
            cause,
          }),
      });

      const instance = new AgentInstance(metadata, sessionManager, result.session);
      return instance;
    });

    const getAgent = Effect.fn("AgentService.getAgent")(function* (input: { agentId: string }) {
      const projects = yield* project.listProjects();

      for (const p of projects) {
        const storagePath = yield* project.resolveStoragePath(p.path);
        const result = yield* agents.get({ entityBasePath: storagePath, id: input.agentId });
        if (Option.isSome(result)) {
          return result;
        }
      }
      return Option.none<AgentMetadata>();
    });

    const updateAgent = Effect.fn("AgentService.updateAgent")(function* (input: UpdateAgentInput) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });
      if (Option.isNone(projectResult)) {
        return yield* new AgentUpdateError({
          agentId: input.id,
          cause: "Project not found",
        });
      }
      const storagePath = yield* project.resolveStoragePath(projectResult.value.path);

      const metadata = yield* agents
        .update({
          id: input.id,
          name: input.name,
          projectId: input.projectId,
          entityBasePath: storagePath,
          sessionFile: input.sessionFile,
        })
        .pipe(Effect.mapError((cause) => new AgentUpdateError({ agentId: input.id, cause })));

      return metadata;
    });

    const deleteAgent = Effect.fn("AgentService.deleteAgent")(function* (input: {
      agentId: string;
    }) {
      const agentMetadata = yield* getAgent({ agentId: input.agentId });
      if (!Option.isSome(agentMetadata)) {
        return yield* new AgentDeleteError({
          agentId: input.agentId,
          cause: "Agent not found",
        });
      }

      const projectResult = yield* project.getProjectDetail({ id: agentMetadata.value.projectId });
      if (Option.isNone(projectResult)) {
        return yield* new AgentDeleteError({
          agentId: input.agentId,
          cause: "Project not found",
        });
      }
      const storagePath = yield* project.resolveStoragePath(projectResult.value.path);

      yield* removeInstance({ agentId: input.agentId });

      yield* agents
        .delete({ entityBasePath: storagePath, id: input.agentId })
        .pipe(Effect.mapError((cause) => new AgentDeleteError({ agentId: input.agentId, cause })));
    });

    const listAgents = Effect.fn("AgentService.listAgents")(function* (input: {
      projectId: string;
    }) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });
      if (Option.isNone(projectResult)) return [];
      const storagePath = yield* project.resolveStoragePath(projectResult.value.path);
      return yield* agents.list({ entityBasePath: storagePath });
    });

    const getInstance = Effect.fn("AgentService.getInstance")(function* (input: {
      agentId: string;
    }) {
      const map = yield* SynchronizedRef.get(instancesRef);
      const cached = map.get(input.agentId);
      if (cached) return Option.some(cached);

      const metadata = yield* getAgent({ agentId: input.agentId });
      if (Option.isNone(metadata)) {
        return Option.none<AgentInstance>();
      }

      const projectResult = yield* project.getProjectDetail({ id: metadata.value.projectId });
      if (Option.isNone(projectResult)) {
        return Option.none<AgentInstance>();
      }

      const storagePath = yield* project.resolveStoragePath(projectResult.value.path);
      const instance = yield* buildInstance({
        metadata: metadata.value,
        entityBasePath: storagePath,
        projectPath: projectResult.value.path,
      });

      yield* SynchronizedRef.update(instancesRef, (current) => {
        const next = new Map(current);
        next.set(input.agentId, instance);
        return next;
      });

      return Option.some(instance);
    });

    const removeInstance = (input: { agentId: string }): Effect.Effect<void> =>
      SynchronizedRef.update(instancesRef, (current) => {
        const instance = current.get(input.agentId);
        if (instance) {
          instance.dispose();
          const next = new Map(current);
          next.delete(input.agentId);
          return next;
        }
        return current;
      });

    const attachSession = Effect.fn("AgentService.attachSession")(function* (input: {
      agentId: string;
      sessionFile: string;
    }) {
      const metadataOpt = yield* getAgent({ agentId: input.agentId });
      if (Option.isNone(metadataOpt)) {
        return yield* new AgentUpdateError({
          agentId: input.agentId,
          cause: "Agent not found",
        });
      }

      const metadata = metadataOpt.value;

      const exists = yield* fs.exists(input.sessionFile);
      if (!exists) {
        return yield* new AgentUpdateError({
          agentId: input.agentId,
          cause: `Session file not found: ${input.sessionFile}`,
        });
      }

      yield* removeInstance({ agentId: input.agentId });

      const updated = yield* updateAgent({
        projectId: metadata.projectId,
        id: input.agentId,
        name: metadata.name,
        sessionFile: input.sessionFile,
      });

      return updated;
    });

    const createNewSession = Effect.fn("AgentService.createNewSession")(function* (input: {
      agentId: string;
    }) {
      const metadataOpt = yield* getAgent({ agentId: input.agentId });
      if (Option.isNone(metadataOpt)) {
        return yield* new AgentUpdateError({
          agentId: input.agentId,
          cause: "Agent not found",
        });
      }

      const metadata = metadataOpt.value;

      const projectResult = yield* project.getProjectDetail({ id: metadata.projectId });
      if (Option.isNone(projectResult)) {
        return yield* new AgentUpdateError({
          agentId: input.agentId,
          cause: "Project not found",
        });
      }

      const projectPath = projectResult.value.path;

      const sessionManager = SessionManager.create(projectPath);
      const sessionId = sessionManager.newSession();
      if (!sessionId) {
        return yield* new AgentUpdateError({
          agentId: input.agentId,
          cause: "Failed to create new session",
        });
      }

      const newSessionFile = sessionManager.getSessionFile();
      if (!newSessionFile) {
        return yield* new AgentUpdateError({
          agentId: input.agentId,
          cause: "Failed to get session file path",
        });
      }

      yield* removeInstance({ agentId: input.agentId });

      const updated = yield* updateAgent({
        projectId: metadata.projectId,
        id: input.agentId,
        name: metadata.name,
        sessionFile: newSessionFile,
      });

      return updated;
    });

    const listSessions = Effect.fn("AgentService.listSessions")(function* (input: {
      projectId: string;
    }) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });
      if (Option.isNone(projectResult)) return [] as SessionInfo[];
      return yield* Effect.tryPromise({
        try: () => SessionManager.list(projectResult.value.path),
        catch: () => [] as SessionInfo[],
      });
    });

    const listAvailableModels = Effect.sync(() => {
      const availableModels = modelRegistry.getAvailable();
      return availableModels.map((model) => ({
        provider: model.provider,
        id: model.id,
        name: model.name,
        fullId: `${model.provider}/${model.id}`,
      }));
    });

    const getPiSettings = Effect.sync((): PiSettings => {
      return {
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
        skills: settingsManager.getSkillPaths() as PiSettings["skills"],
        prompts: settingsManager.getPromptTemplatePaths() as PiSettings["prompts"],
        themes: settingsManager.getThemePaths() as PiSettings["themes"],
        doubleEscapeAction: settingsManager.getDoubleEscapeAction(),
        treeFilterMode: settingsManager.getTreeFilterMode(),
        thinkingBudgets: settingsManager.getThinkingBudgets(),
        packages: (settingsManager.getPackages() ?? []) as PiSettings["packages"],
        extensions: settingsManager.getExtensionPaths() as PiSettings["extensions"],
        enabledModels: settingsManager.getEnabledModels() as PiSettings["enabledModels"],
        sessionDir: settingsManager.getSessionDir(),
      };
    });

    const updatePiSettings = Effect.fn("AgentService.updatePiSettings")(function* (
      partial: PiPartialSettings,
    ) {
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
      if (partial.compaction !== undefined && partial.compaction.enabled !== undefined) {
        settingsManager.setCompactionEnabled(partial.compaction.enabled);
      }
      if (partial.retry !== undefined && partial.retry.enabled !== undefined) {
        settingsManager.setRetryEnabled(partial.retry.enabled);
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
      if (partial.terminal?.showImages !== undefined) {
        settingsManager.setShowImages(partial.terminal.showImages);
      }
      if (partial.terminal?.clearOnShrink !== undefined) {
        settingsManager.setClearOnShrink(partial.terminal.clearOnShrink);
      }
      if (partial.images?.autoResize !== undefined) {
        settingsManager.setImageAutoResize(partial.images.autoResize);
      }
      if (partial.images?.blockImages !== undefined) {
        settingsManager.setBlockImages(partial.images.blockImages);
      }
      if (partial.skills !== undefined) {
        settingsManager.setSkillPaths(partial.skills as string[]);
      }
      if (partial.prompts !== undefined) {
        settingsManager.setPromptTemplatePaths(partial.prompts as string[]);
      }
      if (partial.themes !== undefined) {
        settingsManager.setThemePaths(partial.themes as string[]);
      }
      if (partial.doubleEscapeAction !== undefined) {
        settingsManager.setDoubleEscapeAction(partial.doubleEscapeAction);
      }
      if (partial.treeFilterMode !== undefined) {
        settingsManager.setTreeFilterMode(partial.treeFilterMode);
      }
      if (partial.packages !== undefined) {
        settingsManager.setPackages(partial.packages as PackageSource[]);
      }
      if (partial.extensions !== undefined) {
        settingsManager.setExtensionPaths(partial.extensions as string[]);
      }
      if (partial.enabledModels !== undefined) {
        settingsManager.setEnabledModels(partial.enabledModels as string[]);
      }

      const overrides: Record<string, unknown> = {};
      if (partial.compaction !== undefined) {
        overrides.compaction = partial.compaction;
      }
      if (partial.retry !== undefined) {
        overrides.retry = partial.retry;
      }
      if (partial.markdown?.codeBlockIndent !== undefined) {
        overrides.markdown = partial.markdown;
      }
      if (partial.thinkingBudgets !== undefined) {
        overrides.thinkingBudgets = partial.thinkingBudgets;
      }
      if (partial.sessionDir !== undefined) {
        overrides.sessionDir = partial.sessionDir;
      }

      if (Object.keys(overrides).length > 0) {
        settingsManager.applyOverrides(
          overrides as Parameters<typeof settingsManager.applyOverrides>[0],
        );
      }

      yield* Effect.promise(() => settingsManager.flush());
      settingsManager.reload();
      return yield* getPiSettings;
    });

    return {
      createAgent,
      getAgent,
      updateAgent,
      deleteAgent,
      listAgents,
      getInstance,
      removeInstance,
      attachSession,
      createNewSession,
      listSessions,
      listAvailableModels,
      getPiSettings,
      updatePiSettings,
    } as const;
  }),
}) {
  static layer = Layer.effect(AgentService, AgentService.make).pipe(
    Layer.provideMerge(EntityService.layer),
    Layer.provideMerge(ProjectService.live),
  );
}
