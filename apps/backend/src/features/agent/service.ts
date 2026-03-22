import { Effect, FileSystem, Layer, Path, Schema, ServiceMap } from "effect";
import {
  AgentMetadata,
  AgentMetadataSchema,
  CreateAgentInput,
  ListAgentsInput,
} from "@pixxl/shared";
import { AgentError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { nanoid } from "nanoid";

function generateId(): string {
  const id = nanoid(8);
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

type AgentServiceShape = {
  readonly createAgent: (input: CreateAgentInput) => Effect.Effect<AgentMetadata, AgentError>;
  readonly listAgents: (input: ListAgentsInput) => Effect.Effect<AgentMetadata[], AgentError>;
};

export class AgentService extends ServiceMap.Service<AgentService, AgentServiceShape>()(
  "@pixxl/AgentService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const projectService = yield* ProjectService;

      const createAgent = Effect.fn("AgentService.createAgent")(function* (input: CreateAgentInput) {
        const projects = yield* projectService.listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new AgentError({ message: `Project with id ${input.projectId} not found` });
        }

        const agentsPath = path.join(project.path, "agents");
        const exists = yield* fs.exists(agentsPath);

        if (!exists) {
          yield* fs.makeDirectory(agentsPath, { recursive: true });
        }

        const id = generateId();
        const now = new Date().toISOString();
        const metadata: AgentMetadata = {
          id,
          name: input.name,
          provider: input.provider,
          model: input.model,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs.writeFileString(
          path.join(agentsPath, `${id}.json`),
          JSON.stringify(metadata, null, 2),
        );

        return metadata;
      });

      const listAgents = Effect.fn("AgentService.listAgents")(function* (input: ListAgentsInput) {
        const projects = yield* projectService.listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new AgentError({ message: `Project with id ${input.projectId} not found` });
        }

        const agentsPath = path.join(project.path, "agents");
        const exists = yield* fs.exists(agentsPath);

        if (!exists) {
          return [];
        }

        const entries = yield* fs.readDirectory(agentsPath);
        const agentFiles = entries.filter((e) => e.endsWith(".json"));

        if (agentFiles.length === 0) {
          return [];
        }

        const decodeAgent = Schema.decodeUnknownEffect(
          Schema.fromJsonString(AgentMetadataSchema),
        );

        const agents = yield* Effect.all(
          agentFiles.map((file) =>
            fs.readFileString(path.join(agentsPath, file)).pipe(
              Effect.flatMap((content) => decodeAgent(content)),
            ),
          ),
          { concurrency: "unbounded" },
        );

        return agents;
      });

      return { createAgent, listAgents } as const;
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
