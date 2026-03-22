import { Effect, FileSystem, Layer, Path, Schema, ServiceMap } from "effect";
import {
  CreateProjectInput,
  DeleteProjectInput,
  GetProjectDetailInput,
  ProjectMetadata,
  ProjectMetadataSchema,
} from "@pixxl/shared";
import { ProjectError } from "./error";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { slugify } from "@/utils/slug";
import { generateId } from "@/utils/id";

type ProjectServiceShape = {
  readonly createProject: (
    input: CreateProjectInput,
  ) => Effect.Effect<ProjectMetadata, ProjectError>;
  readonly deleteProject: (input: DeleteProjectInput) => Effect.Effect<void, ProjectError>;
  readonly listProjects: () => Effect.Effect<ProjectMetadata[], ProjectError>;
  readonly getProjectDetail: (
    input: GetProjectDetailInput,
  ) => Effect.Effect<ProjectMetadata, ProjectError>;
};

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
        const cfg = yield* config.loadConfig();

        const projectPath = path.join(cfg.workspace.directory, slugify(input.name));
        const exists = yield* fs.exists(projectPath);

        if (exists) {
          yield* new ProjectError({ message: `Project already exists at ${projectPath}` });
        }

        yield* fs.makeDirectory(projectPath, { recursive: true });

        yield* Effect.all(
          ["agents", "documents", "terminals", "commands"].map((item) =>
            fs.makeDirectory(path.join(projectPath, item), { recursive: true }),
          ),
          { concurrency: "unbounded" },
        );

        const now = new Date().toISOString();
        const metadata: ProjectMetadata = {
          id: generateId(),
          name: input.name,
          path: projectPath,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs.writeFileString(
          path.join(projectPath, "project.json"),
          JSON.stringify(metadata, null, 2),
        );

        return metadata;
      });

      const deleteProject = Effect.fn("ProjectService.deleteProject")(function* (
        input: DeleteProjectInput,
      ) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.id);

        if (!project) {
          yield* new ProjectError({ message: `Project with id ${input.id} not found` });
          return;
        }

        const exists = yield* fs.exists(project.path);

        if (!exists) {
          yield* new ProjectError({ message: `Project does not exist at ${project.path}` });
        }

        yield* fs.remove(project.path, { recursive: true });
      });

      const listProjects = Effect.fn("ProjectService.listProjects")(function* () {
        const cfg = yield* config.loadConfig();

        const workspaceExists = yield* fs.exists(cfg.workspace.directory);

        if (!workspaceExists) {
          return [];
        }

        const entries = yield* fs.readDirectory(cfg.workspace.directory);
        const decodeProject = Schema.decodeUnknownEffect(
          Schema.fromJsonString(ProjectMetadataSchema),
        );

        const projects = yield* Effect.all(
          entries.map((entry) =>
            Effect.gen(function* () {
              const projectDir = path.join(cfg.workspace.directory, entry);
              const projectJsonPath = path.join(projectDir, "project.json");

              const exists = yield* fs.exists(projectJsonPath);
              if (!exists) return;

              const content = yield* fs.readFileString(projectJsonPath);
              const metadata = yield* decodeProject(content);
              return metadata;
            }),
          ),
          { concurrency: "unbounded" },
        );

        return projects.filter((p) => p !== undefined);
      });

      const getProjectDetail = Effect.fn("ProjectService.getProjectDetail")(function* (
        input: GetProjectDetailInput,
      ) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.id);

        if (!project) {
          yield* new ProjectError({ message: `Project with id ${input.id} not found` });
        }

        return project;
      });

      return { createProject, deleteProject, listProjects, getProjectDetail } as const;
    }),
  },
) {
  static layer = Layer.effect(ProjectService, ProjectService.make);
  static live = ProjectService.layer.pipe(
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
