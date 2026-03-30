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
  InvalidProjectPathError,
  WorkspaceError,
} from "./error";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";

type ProjectServiceShape = {
  readonly createProject: (
    input: CreateProjectInput,
  ) => Effect.Effect<
    ProjectMetadata,
    ProjectAlreadyExistsError | ProjectCreateError | InvalidProjectPathError | WorkspaceError
  >;
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

      const expandHomeDir = (inputPath: string): string => {
        if (inputPath.startsWith("~/")) {
          return inputPath.replace("~", process.env.HOME ?? "~");
        }
        return inputPath;
      };

      const createProject = Effect.fn("ProjectService.createProject")(function* (
        input: CreateProjectInput,
      ) {
        const cfg = yield* config.loadConfig();

        if (!cfg.workspace.directory || cfg.workspace.directory.length === 0) {
          return yield* new WorkspaceError({
            directory: cfg.workspace.directory,
            cause:
              "Workspace directory is not configured. Please set a workspace directory in settings.",
          });
        }

        const expandedWorkspace = expandHomeDir(cfg.workspace.directory);
        const expandedPath = expandHomeDir(input.path);

        // Use the original input path for metadata (what user expects to see)
        const metadataPath = expandedPath;

        // Resolve storage path within workspace directory (where we actually store it)
        const projectName = path.isAbsolute(expandedPath)
          ? path.basename(expandedPath)
          : expandedPath;
        const projectPath = path.join(expandedWorkspace, projectName);
        const existingProjects = yield* listProjects();
        // Check for duplicate by comparing storage names (projectName is the directory name in workspace)
        const duplicateStorage = existingProjects.find(
          (p) => path.basename(expandHomeDir(p.path)) === projectName,
        );

        if (duplicateStorage) {
          return yield* new ProjectAlreadyExistsError({
            projectPath,
            cause: "Project with this name already exists in workspace",
          });
        }

        const duplicateName = existingProjects.find((p) => p.name === input.name);

        if (duplicateName) {
          return yield* new ProjectAlreadyExistsError({
            projectName: input.name,
            cause: "Project with this name already exists in workspace",
          });
        }

        yield* fs
          .makeDirectory(projectPath, { recursive: true })
          .pipe(Effect.mapError((cause) => new ProjectCreateError({ projectPath, cause })));

        yield* Effect.all(
          ["agents", "documents", "terminals", "commands"].map((item) =>
            fs
              .makeDirectory(path.join(projectPath, item), { recursive: true })
              .pipe(Effect.mapError((cause) => new ProjectCreateError({ projectPath, cause }))),
          ),
          { concurrency: "unbounded" },
        );

        const now = new Date().toISOString();
        const metadata: ProjectMetadata = {
          id: input.id,
          name: input.name,
          path: metadataPath,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs
          .writeFileString(
            path.join(projectPath, "project.json"),
            JSON.stringify(metadata, null, 2),
          )
          .pipe(Effect.mapError((cause) => new ProjectCreateError({ projectPath, cause })));

        return metadata;
      });

      const deleteProject = Effect.fn("ProjectService.deleteProject")(function* (
        input: DeleteProjectInput,
      ) {
        const cfg = yield* config.loadConfig();
        const projects = yield* listProjects();
        const project = projects.find((p) => p.id === input.id);

        if (!project) {
          return yield* new ProjectNotFoundError({ projectId: input.id });
        }

        // Resolve the actual storage path in workspace (not the metadata path)
        const projectName = path.basename(expandHomeDir(project.path));
        const expandedWorkspace = expandHomeDir(cfg.workspace.directory);
        const storagePath = path.join(expandedWorkspace, projectName);

        const exists = yield* fs
          .exists(storagePath)
          .pipe(
            Effect.mapError(
              (cause) =>
                new ProjectDeleteError({ projectId: input.id, projectPath: storagePath, cause }),
            ),
          );

        if (!exists) {
          return yield* new ProjectNotFoundError({
            projectId: input.id,
            projectPath: storagePath,
          });
        }

        yield* fs
          .remove(storagePath, { recursive: true })
          .pipe(
            Effect.mapError(
              (cause) =>
                new ProjectDeleteError({ projectId: input.id, projectPath: storagePath, cause }),
            ),
          );
      });

      const listProjects = Effect.fn("ProjectService.listProjects")(function* () {
        const cfg = yield* config.loadConfig();

        const workspaceExists = yield* fs
          .exists(cfg.workspace.directory)
          .pipe(
            Effect.mapError(
              (cause) => new WorkspaceError({ directory: cfg.workspace.directory, cause }),
            ),
          );

        if (!workspaceExists) return [];

        const entries = yield* fs
          .readDirectory(cfg.workspace.directory)
          .pipe(
            Effect.mapError(
              (cause) => new WorkspaceError({ directory: cfg.workspace.directory, cause }),
            ),
          );

        const projects = yield* Effect.all(
          entries.map((entry) =>
            Effect.gen(function* () {
              const projectDir = path.join(cfg.workspace.directory, entry);
              const projectJsonPath = path.join(projectDir, "project.json");

              const exists = yield* fs
                .exists(projectJsonPath)
                .pipe(
                  Effect.mapError(
                    (cause) => new ProjectReadError({ projectPath: projectDir, cause }),
                  ),
                );
              if (!exists) return;

              const content = yield* fs
                .readFileString(projectJsonPath)
                .pipe(
                  Effect.mapError(
                    (cause) => new ProjectReadError({ projectPath: projectDir, cause }),
                  ),
                );
              const metadata = yield* decodeProject(content).pipe(
                Effect.mapError(
                  (cause) => new ProjectReadError({ projectPath: projectDir, cause }),
                ),
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

      return {
        createProject,
        deleteProject,
        listProjects,
        getProjectDetail,
      } as unknown as ProjectServiceShape;
    }),
  },
) {
  static layer = Layer.effect(ProjectService, ProjectService.make);
  static live = ProjectService.layer.pipe(
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
