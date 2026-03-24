import { Effect, Layer, Option, ServiceMap } from "effect";
import { AgentMetadata, AgentMetadataSchema, CreateAgentInput, EntityService } from "@pixxl/shared";
import { AgentNotFoundError, AgentCreateError, AgentUpdateError, AgentDeleteError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";

export class AgentService extends ServiceMap.Service<AgentService>()("@pixxl/AgentService", {
  make: Effect.gen(function* () {
    const entity = yield* EntityService;
    const project = yield* ProjectService;

    const agents = entity.forEntity<AgentMetadata, CreateAgentInput>({
      directoryName: "agents",
      schema: AgentMetadataSchema,
      create: ({ id, now, name }) => ({
        id,
        name,
        createdAt: now,
        updatedAt: now,
      }),
      update: (current, { now, name }) => ({
        ...current,
        name,
        updatedAt: now,
      }),
    });

    const createAgent = Effect.fn("AgentService.createAgent")(function* (input: CreateAgentInput) {
      const projectResult = yield* project.getProjectDetail({ id: input.projectId });

      if (Option.isNone(projectResult)) {
        return Option.none();
      }

      const agent = yield* agents
        .create({
          id: input.id,
          projectId: input.projectId,
          name: input.name,
          projectPath: projectResult.value.path,
        })
        .pipe(
          Effect.mapError(
            (cause) =>
              new AgentCreateError({
                name: input.name,
                projectId: input.projectId,
                cause,
              }),
          ),
        );

      return Option.some(agent);
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

    return { createAgent, getAgent, updateAgent, deleteAgent, listAgents } as const;
  }),
}) {
  static layer = Layer.effect(AgentService, AgentService.make).pipe(
    Layer.provideMerge(EntityService.layer),
    Layer.provideMerge(ProjectService.layer),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
