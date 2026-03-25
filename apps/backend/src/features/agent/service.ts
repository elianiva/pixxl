import { Effect, Layer, Option, Either } from "effect";
import {
  AgentMetadata,
  AgentMetadataSchema,
  CreateAgentInput,
  EntityService,
  type AgentRuntimeState,
  type PiSessionInfo,
} from "@pixxl/shared";
import {
  AgentNotFoundError,
  AgentCreateError,
  AgentUpdateError,
  AgentDeleteError,
  AgentAttachError,
  PiSessionCreateError,
} from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { createPiSession, openPiSession, listPiSessions, deletePiSessionFile } from "./pi";
import { agentManager } from "./manager";
import { getActorRuntimeState } from "./actor";

export class AgentService extends Effect.Service<AgentService>()("@pixxl/AgentService", {
  make: Effect.gen(function* () {
    const entity = yield* EntityService;
    const project = yield* ProjectService;

    const agents = entity.forEntity<AgentMetadata, CreateAgentInput>({
      directoryName: "agents",
      schema: AgentMetadataSchema,
      create: ({ id, now, name, pi }) => ({
        id,
        name,
        createdAt: now,
        updatedAt: now,
        pi,
      }),
      update: (current, { now, name }) => ({
        ...current,
        name,
        updatedAt: now,
      }),
    });

    /**
     * Create a new agent with Pi session attachment.
     * Uses compensating transaction pattern:
     * 1. Create Pi session first
     * 2. If metadata write fails, try to delete the Pi session file
     * 3. If cleanup fails, surface orphan info explicitly
     */
    const createAgent = Effect.fn("AgentService.createAgent")(function* (input: CreateAgentInput) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });

      if (Option.isNone(projectResult)) {
        return Option.none();
      }

      const projectPath = projectResult.value.path;

      // Step 1: Create Pi session first (outside of atomic transaction)
      const { sessionFile } = yield* createPiSession(projectPath).pipe(
        Effect.mapError(
          (cause) =>
            new PiSessionCreateError({
              projectPath,
              cause,
            }),
        ),
      );

      // Step 2: Create agent metadata with Pi session reference
      const metadataResult = yield* Effect.either(
        agents.create({
          id: input.id,
          projectId: input.projectId,
          name: input.name,
          projectPath,
          pi: { sessionFile },
        }),
      );

      // Step 3: Compensating cleanup if metadata creation failed
      if (Either.isLeft(metadataResult)) {
        const cleanupResult = yield* deletePiSessionFile(sessionFile);

        if (Either.isLeft(cleanupResult)) {
          // Cleanup failed - surface orphan info explicitly
          return yield* new AgentCreateError({
            name: input.name,
            projectId: input.projectId,
            cause: `Metadata creation failed, and cleanup of orphaned Pi session file also failed. Manual cleanup required: ${sessionFile}`,
          });
        }

        // Cleanup succeeded, now fail with original error
        return yield* new AgentCreateError({
          name: input.name,
          projectId: input.projectId,
          cause: metadataResult.left,
        });
      }

      // Success - create and cache the actor
      const metadata = metadataResult.right;
      const sessionManager = yield* openPiSession(sessionFile, projectPath);

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
          projectId: input.projectId,
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

    /**
     * Delete agent - removes only app metadata, NOT the Pi session file.
     * The Pi session file remains accessible via CLI and can be reattached.
     */
    const deleteAgent = Effect.fn("AgentService.deleteAgent")(function* (input: {
      projectId: string;
      id: string;
    }) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });

      if (Option.isNone(projectResult)) {
        return yield* Effect.fail(
          new AgentDeleteError({
            agentId: input.id,
            projectId: input.projectId,
          }),
        );
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
          Effect.map(Option.map(() => true)),
        );
    });

    const listAgents = Effect.fn("AgentService.listAgents")(function* (input: {
      projectId: string;
    }) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });

      if (Option.isNone(projectResult)) return [];

      return yield* agents.list({
        projectPath: projectResult.value.path,
      });
    });

    /**
     * Attach a Pi session to an agent.
     * Validates that the session file belongs to the same project.
     */
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

      // Validate and open the session file (checks cwd matches project)
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
        pi: { sessionFile: input.sessionFile },
        updatedAt: new Date().toISOString(),
      };

      // Persist the update
      yield* agents.update({
        id: input.agentId,
        projectId: input.projectId,
        projectPath,
        name: updated.name,
      });

      // Notify actor about session switch
      const actor = agentManager.get(input.agentId);
      if (actor) {
        actor.send({ type: "ATTACH_SESSION", sessionManager: _sessionManager });
      }

      return Option.some(updated);
    });

    /**
     * Switch to a different Pi session (same as attach, but semantic naming).
     */
    const switchSession = Effect.fn("AgentService.switchSession")(function* (input: {
      projectId: string;
      agentId: string;
      sessionFile: string;
    }) {
      return yield* attachSession(input);
    });

    /**
     * List attachable Pi sessions for a project (same-project sessions).
     */
    const listAttachableSessions = Effect.fn("AgentService.listAttachableSessions")(
      function* (input: { projectId: string }): Effect.Effect<PiSessionInfo[], AgentNotFoundError> {
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

    /**
     * Get agent runtime state (hydrating/ready/streaming + queues).
     */
    const getAgentRuntime = Effect.fn("AgentService.getAgentRuntime")(function* (input: {
      projectId: string;
      agentId: string;
    }): Effect.Effect<Option.Option<AgentRuntimeState>, AgentNotFoundError> {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });

      if (Option.isNone(projectResult)) {
        return Option.none();
      }

      // Get or create actor for this agent
      let actor = agentManager.get(input.agentId);

      if (!actor) {
        // Actor not in cache - need to hydrate from metadata
        const agentResult = yield* agents.get({
          projectPath: projectResult.value.path,
          id: input.agentId,
        });

        if (Option.isNone(agentResult)) {
          return Option.none();
        }

        const metadata = agentResult.value;

        // Open Pi session
        const sessionManager = yield* openPiSession(
          metadata.pi.sessionFile,
          projectResult.value.path,
        );

        // Create actor
        actor = agentManager.getOrCreate({
          agentId: input.agentId,
          projectId: input.projectId,
          projectPath: projectResult.value.path,
          metadata,
          sessionManager,
        });
      }

      const actorState = getActorRuntimeState(actor);

      return Option.some({
        agentId: input.agentId,
        projectId: input.projectId,
        status: actorState.status,
        queuedSteering: actorState.queuedSteering,
        queuedFollowUp: actorState.queuedFollowUp,
        currentSessionFile: "",
      });
    });

    return {
      createAgent,
      getAgent,
      updateAgent,
      deleteAgent,
      listAgents,
      attachSession,
      switchSession,
      listAttachableSessions,
      getAgentRuntime,
    } as const;
  }),
}) {
  static layer = Layer.effect(AgentService, AgentService.make).pipe(
    Layer.provideMerge(EntityService.layer),
    Layer.provideMerge(ProjectService.layer),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
