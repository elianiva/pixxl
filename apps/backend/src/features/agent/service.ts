import { Effect, Layer, Option, ServiceMap, FileSystem, Schedule } from "effect";
import type {
  AgentMetadata,
  CreateAgentInput,
  UpdateAgentInput,
} from "@pixxl/shared";
import { AgentMetadataSchema, EntityService } from "@pixxl/shared";
import { SessionManager, createAgentSession, ModelRegistry } from "@mariozechner/pi-coding-agent";
import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import type { SessionInfo } from "@mariozechner/pi-coding-agent";
import { AgentCreateError, AgentUpdateError, AgentDeleteError } from "./error";
import { AgentInstance } from "./instance";
import { ConfigService } from "../config/service";
import { ProjectService } from "../project/service";

export class AgentService extends ServiceMap.Service<AgentService>()(
  "@pixxl/AgentService",
  {
    make: Effect.gen(function* () {
      const entity = yield* EntityService;
      const project = yield* ProjectService;
      const fs = yield* FileSystem.FileSystem;

      const authStorage = AuthStorage.create();
      const modelRegistry = ModelRegistry.inMemory(authStorage);

      const instances = new Map<string, AgentInstance>();

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

      const createAgent = Effect.fn("AgentService.createAgent")(function* (
        input: CreateAgentInput,
      ) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });
        if (Option.isNone(projectResult)) {
          return yield* new AgentCreateError({
            name: input.name,
            cause: "Project not found",
          });
        }
        const projectPath = projectResult.value.path;

        const sessionManager = SessionManager.create(projectPath);
        const sessionId = sessionManager.newSession();
        if (!sessionId) {
          return yield* new AgentCreateError({
            name: input.name,
            cause: "Failed to create session",
          });
        }

        const sessionFile = sessionManager.getSessionFile();
        if (!sessionFile) {
          return yield* new AgentCreateError({
            name: input.name,
            cause: "SessionManager did not return file path",
          });
        }

        let metadata = yield* agents
          .create({
            id: input.id,
            name: input.name,
            projectId: input.projectId,
            projectPath,
            sessionFile,
          })
          .pipe(Effect.mapError((cause) => new AgentCreateError({ name: input.name, cause })));

        yield* getOrCreateInstance({ metadata, projectPath });

        return metadata;
      });

      const ensureSessionFile = Effect.fn("AgentService.ensureSessionFile")(function* (
        sessionFile: string,
        agentName: string,
      ) {
        const exists = yield* fs.exists(sessionFile).pipe(
          Effect.mapError(
            (cause) =>
              new AgentCreateError({
                name: agentName,
                cause,
              }),
          ),
        );
        if (exists) return true;

        yield* fs.writeFileString(sessionFile, "").pipe(
          Effect.mapError(
            (cause) =>
              new AgentCreateError({
                name: agentName,
                cause,
              }),
          ),
        );

        const verified = yield* fs.exists(sessionFile).pipe(
          Effect.mapError(
            (cause) =>
              new AgentCreateError({
                name: agentName,
                cause,
              }),
          ),
        );

        if (!verified) {
          return yield* new AgentCreateError({
            name: agentName,
            cause: "Session file creation failed verification",
          });
        }

        return true;
      });

      const getOrCreateInstance = Effect.fn("AgentService.getOrCreateInstance")(function* (input: {
        metadata: AgentMetadata;
        projectPath: string;
      }) {
        const existing = instances.get(input.metadata.id);
        if (existing) return existing;

        // Ensure session file exists with retry
        yield* ensureSessionFile(input.metadata.pi.sessionFile, input.metadata.name).pipe(
          Effect.retry({
            schedule: Schedule.exponential("50 millis"),
            times: 3,
            until: (err) => err._tag !== "AgentCreateError",
          }),
        );

        const sessionManager = SessionManager.open(input.metadata.pi.sessionFile);

        const result = yield* Effect.tryPromise({
          try: () =>
            createAgentSession({
              sessionManager,
              authStorage,
              modelRegistry,
            }),
          catch: (cause) =>
            new AgentCreateError({
              name: input.metadata.name,
              cause,
            }),
        });

        const instance = new AgentInstance(input.metadata, sessionManager, result.session);
        instances.set(input.metadata.id, instance);
        return instance;
      });

      const getAgent = Effect.fn("AgentService.getAgent")(function* (input: { agentId: string }) {
        const projects = yield* project.listProjects();

        for (const p of projects) {
          const result = yield* agents.get({ projectPath: p.path, id: input.agentId });
          return result;
        }
        return Option.none<AgentMetadata>();
      });

      const updateAgent = Effect.fn("AgentService.updateAgent")(function* (
        input: UpdateAgentInput,
      ) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });
        if (Option.isNone(projectResult)) {
          return yield* new AgentUpdateError({
            agentId: input.id,
            cause: "Project not found",
          });
        }
        const projectPath = projectResult.value.path;

        const metadata = yield* agents
          .update({
            id: input.id,
            name: input.name,
            projectId: input.projectId,
            projectPath,
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
        const projectPath = projectResult.value.path;

        // Dispose instance
        instances.get(input.agentId)?.dispose();
        instances.delete(input.agentId);

        yield* agents
          .delete({ projectPath, id: input.agentId })
          .pipe(
            Effect.mapError((cause) => new AgentDeleteError({ agentId: input.agentId, cause })),
          );
      });

      const listAgents = Effect.fn("AgentService.listAgents")(function* (input: {
        projectId: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });
        if (Option.isNone(projectResult)) return [];
        return yield* agents.list({ projectPath: projectResult.value.path });
      });

      const getInstance = Effect.fn("AgentService.getInstance")(function* (input: {
        agentId: string;
      }) {
        const cached = instances.get(input.agentId);
        if (cached) return Option.some(cached);

        const metadata = yield* getAgent({ agentId: input.agentId });
        if (Option.isNone(metadata)) {
          return Option.none<AgentInstance>();
        }

        const projectResult = yield* project.getProjectDetail({ id: metadata.value.projectId });
        if (Option.isNone(projectResult)) {
          return Option.none<AgentInstance>();
        }

        const instance = yield* getOrCreateInstance({ metadata: metadata.value, projectPath: projectResult.value.path });
        return Option.some(instance);
      });

      const removeInstance = (input: { agentId: string }): void => {
        const instance = instances.get(input.agentId);
        if (instance) {
          instance.dispose();
          instances.delete(input.agentId);
        }
      };

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

        // Validate session file exists
        const exists = yield* fs.exists(input.sessionFile);
        if (!exists) {
          return yield* new AgentUpdateError({
            agentId: input.agentId,
            cause: `Session file not found: ${input.sessionFile}`,
          });
        }

        // Remove old instance
        removeInstance({ agentId: input.agentId });

        // Update metadata
        const updated = yield* updateAgent({
          projectId: metadata.projectId,
          id: input.agentId,
          name: metadata.name,
          sessionFile: input.sessionFile,
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

      // oxlint-disable-next-line require-yield
      const listAvailableModels = Effect.fn("AgentService.listAvailableModels")(function* () {
        const availableModels = modelRegistry.getAvailable();
        return availableModels.map((model) => ({
          provider: model.provider,
          id: model.id,
          name: model.name,
          fullId: `${model.provider}/${model.id}`,
        }));
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
        listSessions,
        listAvailableModels,
      } as const;
    }),
  },
) {
  static layer = Layer.effect(AgentService, AgentService.make).pipe(
    Layer.provideMerge(EntityService.layer),
    Layer.provideMerge(ProjectService.live),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
