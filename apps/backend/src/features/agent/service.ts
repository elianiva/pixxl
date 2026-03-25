import { Effect, Layer, Option, ServiceMap } from "effect";
import {
  AgentMetadata,
  AgentMetadataSchema,
  CreateAgentInput,
  EntityService,
  type AgentRuntimeState,
  type PiSessionInfo,
  type AgentHistory,
} from "@pixxl/shared";
import {
  AgentNotFoundError,
  AgentCreateError,
  AgentUpdateError,
  AgentDeleteError,
  AgentAttachError,
  PiSessionCreateError,
  PiSessionValidationError,
} from "./error";
import { ProjectService } from "../project/service";
import { ProjectReadError, WorkspaceError } from "../project/error";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { createPiSession, openPiSession, listPiSessions, deletePiSessionFile } from "./pi";
import { agentManager } from "./manager";
import { getActorRuntimeState } from "./actor";

export type AgentServiceError =
  | AgentNotFoundError
  | AgentCreateError
  | AgentUpdateError
  | AgentDeleteError
  | AgentAttachError
  | PiSessionCreateError
  | PiSessionValidationError
  | ProjectReadError
  | WorkspaceError;

export type AgentServiceApi = {
  readonly createAgent: (
    input: CreateAgentInput,
  ) => Effect.Effect<Option.Option<AgentMetadata>, AgentServiceError>;
  readonly getAgent: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<Option.Option<AgentMetadata>, AgentServiceError>;
  readonly updateAgent: (input: {
    projectId: string;
    id: string;
    name: string;
  }) => Effect.Effect<Option.Option<AgentMetadata>, AgentServiceError>;
  readonly deleteAgent: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<Option.Option<boolean>, AgentServiceError>;
  readonly listAgents: (input: { projectId: string }) => Effect.Effect<AgentMetadata[], never>;
  readonly ensureAgentActor: (input: {
    projectId: string;
    agentId: string;
  }) => Effect.Effect<Option.Option<boolean>, AgentServiceError>;
  readonly attachSession: (input: {
    projectId: string;
    agentId: string;
    sessionFile: string;
  }) => Effect.Effect<Option.Option<AgentMetadata>, AgentServiceError>;
  readonly switchSession: (input: {
    projectId: string;
    agentId: string;
    sessionFile: string;
  }) => Effect.Effect<Option.Option<AgentMetadata>, AgentServiceError>;
  readonly listAttachableSessions: (input: {
    projectId: string;
  }) => Effect.Effect<PiSessionInfo[], AgentServiceError>;
  readonly getAgentRuntime: (input: {
    projectId: string;
    agentId: string;
  }) => Effect.Effect<Option.Option<AgentRuntimeState>, AgentServiceError>;
  readonly getAgentHistory: (input: {
    projectId: string;
    agentId: string;
  }) => Effect.Effect<Option.Option<AgentHistory>, AgentServiceError>;
};

export class AgentService extends ServiceMap.Service<AgentService, AgentServiceApi>()(
  "@pixxl/AgentService",
  {
    make: Effect.gen(function* () {
      const entity = yield* EntityService;
      const project = yield* ProjectService;

      const agents = entity.forEntity<
        AgentMetadata,
        { name: string; projectId: string; sessionFile: string },
        { name: string; sessionFile?: string }
      >({
        directoryName: "agents",
        schema: AgentMetadataSchema,
        create: ({ id, now, name, projectId, sessionFile }) => ({
          id,
          projectId,
          name,
          createdAt: now,
          updatedAt: now,
          pi: {
            sessionFile,
          },
        }),
        update: (current, { now, name, sessionFile }) => ({
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
          return Option.none();
        }

        const projectPath = projectResult.value.path;

        const { sessionFile, sessionManager } = yield* createPiSession(projectPath);

        const metadataResult = yield* Effect.option(
          agents.create({
            id: input.id,
            name: input.name,
            projectId: input.projectId,
            projectPath,
            sessionFile,
          }),
        );

        // Step 3: Compensating cleanup if metadata creation failed
        if (Option.isNone(metadataResult)) {
          yield* deletePiSessionFile(sessionFile);
          return yield* new AgentCreateError({
            name: input.name,
            projectId: input.projectId,
            cause: "Metadata creation failed",
          });
        }

        // Success - create and cache the actor with existing sessionManager
        const metadata = metadataResult.value;

        agentManager.getOrCreate({
          agentId: metadata.id,
          projectId: input.projectId,
          projectPath,
          metadata,
          sessionManager,
        });

        return Option.some(metadata);
      });

      const getAgent = Effect.fn("AgentService.getAgent")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        return yield* agents
          .get({
            projectPath: projectResult.value.path,
            id: input.id,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new AgentNotFoundError({
                  agentId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );
      });

      const updateAgent = Effect.fn("AgentService.updateAgent")(function* (input: {
        projectId: string;
        id: string;
        name: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        return yield* agents
          .update({
            id: input.id,
            name: input.name,
            projectPath: projectResult.value.path,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new AgentUpdateError({
                  agentId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );
      });

      const deleteAgent = Effect.fn("AgentService.deleteAgent")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return yield* new AgentDeleteError({
            agentId: input.id,
            projectId: input.projectId,
          });
        }

        // Stop and remove the actor runtime for this agent
        agentManager.remove(input.id);

        return yield* agents
          .delete({
            projectPath: projectResult.value.path,
            id: input.id,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new AgentDeleteError({
                  agentId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );
      });

      const listAgents = Effect.fn("AgentService.listAgents")(function* (input: {
        projectId: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) return [];

        const listResult = yield* Effect.option(
          agents.list({
            projectPath: projectResult.value.path,
          }),
        );

        return Option.getOrElse(listResult, () => [] as AgentMetadata[]);
      });

      const ensureAgentActor = Effect.fn("AgentService.ensureAgentActor")(function* (input: {
        projectId: string;
        agentId: string;
      }) {
        const existingActor = agentManager.get(input.agentId);
        if (existingActor) {
          return Option.some(true);
        }

        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        const projectPath = projectResult.value.path;

        const agentResult = yield* agents
          .get({
            projectPath,
            id: input.agentId,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new AgentNotFoundError({
                  agentId: input.agentId,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );

        if (Option.isNone(agentResult)) {
          return Option.none();
        }

        const metadata = agentResult.value;

        const sessionManager = yield* openPiSession(metadata.pi.sessionFile, projectPath);

        agentManager.getOrCreate({
          agentId: input.agentId,
          projectId: input.projectId,
          projectPath,
          metadata,
          sessionManager,
        });

        return Option.some(true);
      });

      const attachSession = Effect.fn("AgentService.attachSession")(function* (input: {
        projectId: string;
        agentId: string;
        sessionFile: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return yield* new AgentAttachError({
            agentId: input.agentId,
            projectId: input.projectId,
            cause: "Project not found",
          });
        }

        const projectPath = projectResult.value.path;

        // Validate and open the session file
        const _sessionManager = yield* openPiSession(input.sessionFile, projectPath);

        // Update agent metadata with new session file
        const agentResult = yield* agents.get({
          projectPath,
          id: input.agentId,
        });

        if (Option.isNone(agentResult)) {
          return yield* new AgentNotFoundError({
            agentId: input.agentId,
            projectId: input.projectId,
          });
        }

        const current = agentResult.value;
        const updated: AgentMetadata = {
          ...current,
          updatedAt: new Date().toISOString(),
        };

        // Persist the update
        yield* agents.update({
          id: input.agentId,
          projectPath,
          name: updated.name,
          sessionFile: input.sessionFile,
        });

        // Notify actor about session switch
        const actor = agentManager.get(input.agentId);
        if (actor) {
          actor.send({ type: "ATTACH_SESSION", sessionManager: _sessionManager });
        }

        return Option.some(updated);
      });

      const switchSession = Effect.fn("AgentService.switchSession")(function* (input: {
        projectId: string;
        agentId: string;
        sessionFile: string;
      }) {
        return yield* attachSession(input);
      });

      const listAttachableSessions = Effect.fn("AgentService.listAttachableSessions")(
        function* (input: { projectId: string }) {
          const projectResult = yield* project.getProjectDetail({ id: input.projectId });

          if (Option.isNone(projectResult)) {
            return yield* new AgentNotFoundError({
              agentId: "",
              projectId: input.projectId,
              cause: "Project not found",
            });
          }

          const sessions = yield* listPiSessions(projectResult.value.path);

          return sessions.map((s) => ({
            path: s.path,
            id: s.id,
            cwd: s.cwd,
            name: s.name,
            parentSessionPath: s.parentSessionPath,
            created: s.created,
            modified: s.modified,
            messageCount: s.messageCount,
            firstMessage: s.firstMessage,
          }));
        },
      );

      const getAgentRuntime = Effect.fn("AgentService.getAgentRuntime")(function* (input: {
        projectId: string;
        agentId: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        const actor = agentManager.get(input.agentId);

        if (!actor) {
          return Option.none();
        }

        const actorState = getActorRuntimeState(actor);

        return Option.some({
          agentId: input.agentId,
          projectId: input.projectId,
          status: actorState.status,
          queuedSteering: actorState.queuedSteering,
          queuedFollowUp: actorState.queuedFollowUp,
          currentSessionFile: actorState.currentSessionFile,
        });
      });

      const getAgentHistory = Effect.fn("AgentService.getAgentHistory")(function* (input: {
        projectId: string;
        agentId: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        const agentResult = yield* agents
          .get({
            projectPath: projectResult.value.path,
            id: input.agentId,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new AgentNotFoundError({
                  agentId: input.agentId,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );

        if (Option.isNone(agentResult)) {
          return Option.none();
        }

        const metadata = agentResult.value;
        const sessionManager = yield* openPiSession(
          metadata.pi.sessionFile,
          projectResult.value.path,
        ).pipe(
          Effect.catchTag("PiSessionValidationError", () =>
            Effect.gen(function* () {
              const { sessionFile, sessionManager } = yield* createPiSession(
                projectResult.value.path,
              );

              yield* agents.update({
                id: input.agentId,
                projectPath: projectResult.value.path,
                name: metadata.name,
                sessionFile,
              });

              const actor = agentManager.get(input.agentId);
              if (actor) {
                actor.send({ type: "ATTACH_SESSION", sessionManager });
              }

              return sessionManager;
            }),
          ),
        );

        const resolvedSessionFile = sessionManager.getSessionFile() ?? metadata.pi.sessionFile;
        const header = sessionManager.getHeader();

        if (!header) {
          return yield* new PiSessionValidationError({
            sessionFile: metadata.pi.sessionFile,
            cause: "Session header missing",
          });
        }

        const sessionName = sessionManager.getSessionName();

        return Option.some({
          agentId: input.agentId,
          projectId: input.projectId,
          sessionFile: resolvedSessionFile,
          sessionId: header.id,
          cwd: header.cwd,
          ...(sessionName !== undefined ? { sessionName } : {}),
          leafId: sessionManager.getLeafId(),
          entries: sessionManager.getEntries(),
        } satisfies AgentHistory);
      });

      return {
        createAgent,
        getAgent,
        updateAgent,
        deleteAgent,
        listAgents,
        ensureAgentActor,
        attachSession,
        switchSession,
        listAttachableSessions,
        getAgentRuntime,
        getAgentHistory,
      } as unknown as AgentServiceApi;
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
