import { Effect, FileSystem, Layer, Path, Schema, ServiceMap } from "effect";
import {
  AgentSchema,
  CreateProjectInput,
  DeleteProjectInput,
  GetProjectDetailInput,
  ListAgentsInput,
  ListTerminalsInput,
  ProjectDetail,
  ProjectMetadata,
  ProjectMetadataSchema,
  TerminalSchema,
} from "@pixxl/shared";
import { ProjectError } from "./error";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { nanoid } from "nanoid";
import { slugify } from "@/utils/slug";

function generateProjectId(): string {
  const id = nanoid(8);
  // Remove any non-alphanumeric chars and lowercase
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

type ProjectServiceShape = {
  readonly createProject: (
    input: CreateProjectInput,
  ) => Effect.Effect<ProjectMetadata, ProjectError>;
  readonly deleteProject: (input: DeleteProjectInput) => Effect.Effect<void, ProjectError>;
  readonly listProjects: () => Effect.Effect<ProjectMetadata[], ProjectError>;
  readonly getProjectDetail: (
    input: GetProjectDetailInput,
  ) => Effect.Effect<ProjectDetail, ProjectError>;
  readonly listAgents: (input: ListAgentsInput) => Effect.Effect<AgentSchema.Type[], ProjectError>;
  readonly listTerminals: (
    input: ListTerminalsInput,
  ) => Effect.Effect<TerminalSchema.Type[], ProjectError>;
};

const mapToProjectError = (message: string) =>
  Effect.mapError((cause) => new ProjectError({ message, cause }));

export class ProjectService extends ServiceMap.Service<ProjectService, ProjectServiceShape>()(
  "@pixxl/ProjectService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const config = yield* ConfigService;

      const createProject = Effect.fn("ProjectService.createProject")(function* (
        input: CreateProjectInput,
      ) {
        const cfg = yield* config.loadConfig().pipe(mapToProjectError("Failed to load config"));

        const projectPath = path.join(cfg.workspace.directory, slugify(input.name));
        const exists = yield* fs
          .exists(projectPath)
          .pipe(mapToProjectError(`Failed to check if project exists at ${projectPath}`));

        if (exists) {
          yield* new ProjectError({
            message: `Project already exists at ${projectPath}`,
          });
        }

        yield* fs
          .makeDirectory(projectPath, { recursive: true })
          .pipe(mapToProjectError(`Failed to create project directory at ${projectPath}`));

        yield* Effect.all(
          ["agents", "documents", "terminals", "commands"].map((item) =>
            fs
              .makeDirectory(path.join(projectPath, item), { recursive: true })
              .pipe(mapToProjectError(`Failed to create ${item} directory at ${projectPath}`)),
          ),
          { concurrency: "unbounded" },
        );

        const now = new Date().toISOString();
        const metadata: ProjectMetadata = {
          id: generateProjectId(),
          name: input.name,
          path: projectPath,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs
          .writeFileString(
            path.join(projectPath, "project.json"),
            JSON.stringify(metadata, null, 2),
          )
          .pipe(
            mapToProjectError(`Failed to write project metadata to ${projectPath}/project.json`),
          );

        return metadata;
      });

      const deleteProject = Effect.fn("ProjectService.deleteProject")(function* (
        input: DeleteProjectInput,
      ) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.id);

        if (!project) {
          yield* new ProjectError({
            message: `Project with id ${input.id} not found`,
          });
          return;
        }

        const exists = yield* fs
          .exists(project.path)
          .pipe(mapToProjectError(`Failed to check if project exists at ${project.path}`));

        if (!exists) {
          yield* new ProjectError({
            message: `Project does not exist at ${project.path}`,
          });
        }

        yield* fs
          .remove(project.path, { recursive: true })
          .pipe(mapToProjectError(`Failed to delete project at ${project.path}`));
      });

      const listProjects = Effect.fn("ProjectService.listProjects")(function* () {
        const cfg = yield* config.loadConfig().pipe(mapToProjectError("Failed to load config"));

        const workspaceExists = yield* fs
          .exists(cfg.workspace.directory)
          .pipe(
            mapToProjectError(`Failed to check if workspace exists at ${cfg.workspace.directory}`),
          );

        if (!workspaceExists) {
          return [];
        }

        const entries = yield* fs
          .readDirectory(cfg.workspace.directory)
          .pipe(
            mapToProjectError(`Failed to read workspace directory at ${cfg.workspace.directory}`),
          );

        const projects = yield* Effect.all(
          entries.map((entry) =>
            Effect.gen(function* () {
              const projectDir = path.join(cfg.workspace.directory, entry);
              const projectJsonPath = path.join(projectDir, "project.json");

              const projectJsonExists = yield* fs
                .exists(projectJsonPath)
                .pipe(
                  mapToProjectError(`Failed to check if project.json exists at ${projectJsonPath}`),
                );
              if (!projectJsonExists) return;

              const content = yield* fs
                .readFileString(projectJsonPath)
                .pipe(mapToProjectError(`Failed to read project.json at ${projectJsonPath}`));
              const metadata = yield* Schema.decodeUnknownEffect(
                Schema.fromJsonString(ProjectMetadataSchema),
              )(content).pipe(
                mapToProjectError(
                  `Failed to decode project.json at ${projectJsonPath}. Fix missing/invalid fields in project.json.`,
                ),
              );
              return metadata;
            }),
          ),
          { concurrency: "unbounded" },
        );

        return projects.filter((project) => project !== undefined);
      });

      const getProjectDetail = Effect.fn("ProjectService.getProjectDetail")(function* (
        input: GetProjectDetailInput,
      ) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.id);

        if (!project) {
          yield* new ProjectError({
            message: `Project with id ${input.id} not found`,
          });
        }

        return {
          id: project.id,
          name: project.name,
          path: project.path,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      });

      const listAgents = Effect.fn("ProjectService.listAgents")(function* (input: ListAgentsInput) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new ProjectError({
            message: `Project with id ${input.projectId} not found`,
          });
        }

        const agentsPath = path.join(project.path, "agents");
        const agentsDirExists = yield* fs
          .exists(agentsPath)
          .pipe(mapToProjectError(`Failed to check if agents directory exists at ${agentsPath}`));

        if (!agentsDirExists) {
          return [];
        }

        const agentEntries = yield* fs
          .readDirectory(agentsPath)
          .pipe(mapToProjectError(`Failed to read agents directory at ${agentsPath}`));

        const agentFiles = agentEntries.filter((entry) => entry.endsWith(".json"));

        if (agentFiles.length === 0) {
          return [];
        }

        const agents = yield* Effect.all(
          agentFiles.map((file) =>
            Effect.gen(function* () {
              const agentFilePath = path.join(agentsPath, file);
              const content = yield* fs
                .readFileString(agentFilePath)
                .pipe(mapToProjectError(`Failed to read agent file at ${agentFilePath}`));
              const agent = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(AgentSchema))(
                content,
              ).pipe(
                mapToProjectError(
                  `Failed to decode agent file at ${agentFilePath}. Fix missing/invalid fields in agent JSON.`,
                ),
              );
              return agent;
            }),
          ),
          { concurrency: "unbounded" },
        );

        return agents;
      });

      const listTerminals = Effect.fn("ProjectService.listTerminals")(function* (
        input: ListTerminalsInput,
      ) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new ProjectError({
            message: `Project with id ${input.projectId} not found`,
          });
        }

        const terminalsPath = path.join(project.path, "terminals");
        const terminalsDirExists = yield* fs
          .exists(terminalsPath)
          .pipe(
            mapToProjectError(`Failed to check if terminals directory exists at ${terminalsPath}`),
          );

        if (!terminalsDirExists) {
          return [];
        }

        const terminalEntries = yield* fs
          .readDirectory(terminalsPath)
          .pipe(mapToProjectError(`Failed to read terminals directory at ${terminalsPath}`));

        const terminalFiles = terminalEntries.filter((entry) => entry.endsWith(".json"));

        if (terminalFiles.length === 0) {
          return [];
        }

        const terminals = yield* Effect.all(
          terminalFiles.map((file) =>
            Effect.gen(function* () {
              const terminalFilePath = path.join(terminalsPath, file);
              const content = yield* fs
                .readFileString(terminalFilePath)
                .pipe(mapToProjectError(`Failed to read terminal file at ${terminalFilePath}`));
              const terminal = yield* Schema.decodeUnknownEffect(
                Schema.fromJsonString(TerminalSchema),
              )(content).pipe(
                mapToProjectError(
                  `Failed to decode terminal file at ${terminalFilePath}. Fix missing/invalid fields in terminal JSON.`,
                ),
              );
              return terminal;
            }),
          ),
          { concurrency: "unbounded" },
        );

        return terminals;
      });

      return {
        createProject,
        deleteProject,
        listProjects,
        getProjectDetail,
        listAgents,
        listTerminals,
      } as const;
    }),
  },
) {
  static layer = Layer.effect(ProjectService, ProjectService.make);
  static live = ProjectService.layer.pipe(
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
