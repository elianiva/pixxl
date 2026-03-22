import { Effect, FileSystem, Layer, Option, Path, Schema, ServiceMap } from "effect";
import {
  AgentMetadata,
  AgentMetadataSchema,
  CreateAgentInput,
  UpdateAgentInput,
  ListAgentsInput,
} from "@pixxl/shared";
import { AgentError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { generateId } from "@/utils/id";

type AgentServiceShape = {
  readonly createAgent: (
    input: CreateAgentInput,
  ) => Effect.Effect<Option.Option<AgentMetadata>, AgentError>;
  readonly updateAgent: (
    input: UpdateAgentInput,
  ) => Effect.Effect<Option.Option<AgentMetadata>, AgentError>;
  readonly deleteAgent: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<boolean, AgentError>;
  readonly listAgents: (input: ListAgentsInput) => Effect.Effect<AgentMetadata[], AgentError>;
};

export class AgentService extends ServiceMap.Service<AgentService, AgentServiceShape>()(
  "@pixxl/AgentService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const projectService = yield* ProjectService;

      const decodeAgent = Schema.decodeUnknownEffect(Schema.fromJsonString(AgentMetadataSchema));

      const createAgent = Effect.fn("AgentService.createAgent")(function* (
        input: CreateAgentInput,
      ) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(AgentError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new AgentError({ message: `Project with id ${input.projectId} not found` });
          return Option.none();
        }

        const agentsPath = path.join(project.value.path, "agents");
        const exists = yield* fs
          .exists(agentsPath)
          .pipe(AgentError.mapTo(`Failed to check path at ${agentsPath}`));

        if (!exists) {
          yield* fs
            .makeDirectory(agentsPath, { recursive: true })
            .pipe(AgentError.mapTo(`Failed to create directory at ${agentsPath}`));
        }

        const id = generateId();
        const now = new Date().toISOString();
        const metadata: AgentMetadata = {
          id,
          name: input.name,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs
          .writeFileString(path.join(agentsPath, `${id}.json`), JSON.stringify(metadata, null, 2))
          .pipe(
            AgentError.mapTo(
              `Failed to create agent with id ${id} at path ${path.join(agentsPath, `${id}.json`)}`,
            ),
          );

        return Option.some(metadata);
      });

      const updateAgent = Effect.fn("AgentService.updateAgent")(function* (
        input: UpdateAgentInput,
      ) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(AgentError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new AgentError({ message: `Project with id ${input.projectId} not found` });
          return Option.none();
        }

        const filePath = path.join(project.value.path, "agents", `${input.id}.json`);
        const fileExists = yield* fs
          .exists(filePath)
          .pipe(AgentError.mapTo(`Failed to check if agent exists at path ${filePath}`));

        if (!fileExists) {
          yield* new AgentError({ message: `Agent with id ${input.id} not found` });
        }

        const content = yield* fs
          .readFileString(filePath)
          .pipe(AgentError.mapTo(`Failed to read agent at path ${filePath}`));
        const decodeUnknown = Schema.decodeUnknownEffect(
          Schema.fromJsonString(AgentMetadataSchema),
        );
        const current = yield* decodeUnknown(content).pipe(
          AgentError.mapTo(`Failed to decode agent`),
        );

        const updated: AgentMetadata = {
          ...current,
          name: input.name,
          updatedAt: new Date().toISOString(),
        };

        yield* fs
          .writeFileString(filePath, JSON.stringify(updated, null, 2))
          .pipe(AgentError.mapTo(`Failed to update agent with id ${input.id} at path ${filePath}`));

        return Option.some(updated);
      });

      const deleteAgent = Effect.fn("AgentService.deleteAgent")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(AgentError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new AgentError({ message: `Project with id ${input.projectId} not found` });
          return false;
        }

        const filePath = path.join(project.value.path, "agents", `${input.id}.json`);
        const fileExists = yield* fs
          .exists(filePath)
          .pipe(AgentError.mapTo(`Failed to check if agent exists at path ${filePath}`));

        if (!fileExists) {
          yield* new AgentError({ message: `Agent with id ${input.id} not found` });
          return false;
        }

        yield* fs
          .remove(filePath)
          .pipe(AgentError.mapTo(`Failed to delete agent with id ${input.id} at path ${filePath}`));

        return true;
      });

      const listAgents = Effect.fn("AgentService.listAgents")(function* (input: ListAgentsInput) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(AgentError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new AgentError({ message: `Project with id ${input.projectId} not found` });
          return [];
        }

        const agentsPath = path.join(project.value.path, "agents");
        const exists = yield* fs
          .exists(agentsPath)
          .pipe(AgentError.mapTo(`Failed to check if agents path exists at path ${agentsPath}`));

        if (!exists) return [];

        const entries = yield* fs
          .readDirectory(agentsPath)
          .pipe(AgentError.mapTo(`Failed to read agents directory at path ${agentsPath}`));
        const agentFiles = entries.filter((e) => e.endsWith(".json"));

        if (agentFiles.length === 0) return [];

        const agents = yield* Effect.all(
          agentFiles.map((file) =>
            fs.readFileString(path.join(agentsPath, file)).pipe(
              // TODO: ignore invalid configs for now, might need better handling
              Effect.flatMap((content) => decodeAgent(content).pipe(Effect.mapError(() => null))),
              AgentError.mapTo(`Failed to read agent at path ${path.join(agentsPath, file)}`),
            ),
          ),
          { concurrency: "unbounded" },
        );

        return agents.filter((agent) => agent !== null);
      });

      return { createAgent, updateAgent, deleteAgent, listAgents } as const;
    }),
  },
) {
  static layer = Layer.effect(AgentService, AgentService.make);
  static live = AgentService.layer.pipe(
    Layer.provideMerge(ProjectService.layer),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
