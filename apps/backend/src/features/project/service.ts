import { Effect, FileSystem, Layer, Path, ServiceMap } from "effect";
import { CreateProjectInput, ProjectMetadata } from "@pixxl/shared";
import { ProjectError } from "./error";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";

type ProjectServiceShape = {
  readonly createProject: (
    input: CreateProjectInput,
  ) => Effect.Effect<ProjectMetadata, ProjectError>;
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

        const projectPath = path.join(cfg.workspace.directory, input.name);
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

        const metadata: ProjectMetadata = {
          name: input.name,
          path: projectPath,
          createdAt: new Date().toISOString(),
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

      return { createProject } as const;
    }),
  },
) {
  static layer = Layer.effect(ProjectService, ProjectService.make);
  static live = ProjectService.layer.pipe(
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
