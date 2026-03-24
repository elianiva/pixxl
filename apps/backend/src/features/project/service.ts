import { Effect, FileSystem, Layer, Option, Path, Schema, ServiceMap } from "effect";
import {
  CreateProjectInput,
  DeleteProjectInput,
  GetProjectDetailInput,
  ProjectMetadata,
  ProjectMetadataSchema,
} from "@pixxl/shared";
import {
  ProjectNotFoundError,
  ProjectAlreadyExistsError,
  ProjectCreateError,
  ProjectDeleteError,
  ProjectReadError,
  ProjectWriteError,
  WorkspaceError,
} from "./error";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { slugify } from "@/utils/slug";

type ProjectServiceShape = {
  readonly createProject: (
    input: CreateProjectInput,
  ) => Effect.Effect<ProjectMetadata, ProjectAlreadyExistsError | ProjectCreateError | WorkspaceError>;
  readonly deleteProject: (
    input: DeleteProjectInput,
  ) => Effect.Effect<void, ProjectNotFoundError | ProjectDeleteError>;
  readonly listProjects: () => Effect.Effect<ProjectMetadata[], WorkspaceError | ProjectReadError>;
  readonly getProjectDetail: (
    input: GetProjectDetailInput,
  ) => Effect.Effect<Option.Option<ProjectMetadata>, WorkspaceError | ProjectReadError>;
};

export class ProjectService extends ServiceMap.Service<ProjectService, ProjectServiceShape>()(
  "@pixxl/ProjectService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const config = yield* ConfigService;

      const decodeProject = Schema.decodeUnknownEffect(
        Schema.fromJsonString(ProjectMetadataSchema),
      );

      const createProject = Effect.fn("ProjectService.createProject")(function* (
        input: CreateProjectInput,
      ) {
        const cfg = yield* config.loadConfig();

        const projectPath = path.join(cfg.workspace.directory, slugify(input.name));
        const exists = yield* fs.exists(projectPath).pipe(
          Effect.mapError((cause) => new WorkspaceError({ directory: cfg.workspace.directory, cause })),
        );

        if (exists) {
          return yield* new ProjectAlreadyExistsError({ projectPath });
        }

        yield* fs.makeDirectory(projectPath, { recursive: true }).pipe(
          Effect.mapError((cause) => new ProjectCreateError({ projectPath, cause })),
        );

        yield* Effect.all(
          ["agents", "documents", "terminals", "commands"].map((item) =>
            fs.makeDirectory(path.join(projectPath, item), { recursive: true }).pipe(
              Effect.mapError((cause) => new ProjectCreateError({ projectPath, cause })),
            ),
          ),
          { concurrency: "unbounded" },
        );

        const now = new Date().toISOString();
        const metadata: ProjectMetadata = {
          id: input.id,
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
          .pipe(Effect.mapError((cause) => new ProjectWriteError({ projectPath, cause })));

        return metadata;
      });

      const deleteProject = Effect.fn("ProjectService.deleteProject")(function* (
        input: DeleteProjectInput,
      ) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.id);

        if (!project) {
          return yield* new ProjectNotFoundError({ projectId: input.id });
        }

        const exists = yield* fs.exists(project.path).pipe(
          Effect.mapError((cause) =>
            new ProjectDeleteError({ projectId: input.id, projectPath: project.path, cause }),
          ),
        );

        if (!exists) {
          return yield* new ProjectNotFoundError({ projectId: input.id, projectPath: project.path });
        }

        yield* fs.remove(project.path, { recursive: true }).pipe(
          Effect.mapError((cause) =>
            new ProjectDeleteError({ projectId: input.id, projectPath: project.path, cause }),
          ),
        );
      });

      const listProjects = Effect.fn("ProjectService.listProjects")(function* () {
        const cfg = yield* config.loadConfig();

        const workspaceExists = yield* fs.exists(cfg.workspace.directory).pipe(
          Effect.mapError((cause) => new WorkspaceError({ directory: cfg.workspace.directory, cause })),
        );

        if (!workspaceExists) return [];

        const entries = yield* fs.readDirectory(cfg.workspace.directory).pipe(
          Effect.mapError((cause) => new WorkspaceError({ directory: cfg.workspace.directory, cause })),
        );

        const projects = yield* Effect.all(
          entries.map((entry) =>
            Effect.gen(function* () {
              const projectDir = path.join(cfg.workspace.directory, entry);
              const projectJsonPath = path.join(projectDir, "project.json");

              const exists = yield* fs.exists(projectJsonPath).pipe(
                Effect.mapError((cause) => new ProjectReadError({ projectPath: projectDir, cause })),
              );
              if (!exists) return;

              const content = yield* fs.readFileString(projectJsonPath).pipe(
                Effect.mapError((cause) => new ProjectReadError({ projectPath: projectDir, cause })),
              );
              const metadata = yield* decodeProject(content).pipe(
                Effect.mapError((cause) => new ProjectReadError({ projectPath: projectDir, cause })),
              );
              return metadata;
            }),
          ),
          { concurrency: "unbounded" },
        );

        return projects.filter((p): p is ProjectMetadata => p !== undefined);
      });

      const getProjectDetail = Effect.fn("ProjectService.getProjectDetail")(function* (
        input: GetProjectDetailInput,
      ) {
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.id);

        if (!project) {
          return Option.none();
        }

        return Option.some(project);
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
