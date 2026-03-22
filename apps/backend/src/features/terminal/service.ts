import { Effect, FileSystem, Layer, Option, Path, Schema, ServiceMap } from "effect";
import {
  TerminalMetadata,
  TerminalMetadataSchema,
  CreateTerminalInput,
  UpdateTerminalInput,
  ListTerminalsInput,
} from "@pixxl/shared";
import { TerminalError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { generateId } from "@/utils/id";

type TerminalServiceShape = {
  readonly createTerminal: (
    input: CreateTerminalInput,
  ) => Effect.Effect<Option.Option<TerminalMetadata>, TerminalError>;
  readonly updateTerminal: (
    input: UpdateTerminalInput,
  ) => Effect.Effect<Option.Option<TerminalMetadata>, TerminalError>;
  readonly deleteTerminal: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<boolean, TerminalError>;
  readonly listTerminals: (
    input: ListTerminalsInput,
  ) => Effect.Effect<TerminalMetadata[], TerminalError>;
};

export class TerminalService extends ServiceMap.Service<TerminalService, TerminalServiceShape>()(
  "@pixxl/TerminalService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const projectService = yield* ProjectService;

      const decodeTerminal = Schema.decodeUnknownEffect(
        Schema.fromJsonString(TerminalMetadataSchema),
      );

      const createTerminal = Effect.fn("TerminalService.createTerminal")(function* (
        input: CreateTerminalInput,
      ) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(TerminalError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new TerminalError({ message: `Project with id ${input.projectId} not found` });
          return Option.none();
        }

        const terminalsPath = path.join(project.value.path, "terminals");
        const exists = yield* fs
          .exists(terminalsPath)
          .pipe(TerminalError.mapTo(`Failed to check path at ${terminalsPath}`));

        if (!exists) {
          yield* fs
            .makeDirectory(terminalsPath, { recursive: true })
            .pipe(TerminalError.mapTo(`Failed to create directory at ${terminalsPath}`));
        }

        const id = generateId();
        const now = new Date().toISOString();
        const metadata: TerminalMetadata = {
          id,
          name: input.name,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs
          .writeFileString(
            path.join(terminalsPath, `${id}.json`),
            JSON.stringify(metadata, null, 2),
          )
          .pipe(
            TerminalError.mapTo(
              `Failed to create terminal with id ${id} at path ${path.join(terminalsPath, `${id}.json`)}`,
            ),
          );

        return Option.some(metadata);
      });

      const updateTerminal = Effect.fn("TerminalService.updateTerminal")(function* (
        input: UpdateTerminalInput,
      ) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(TerminalError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new TerminalError({ message: `Project with id ${input.projectId} not found` });
          return Option.none();
        }

        const filePath = path.join(project.value.path, "terminals", `${input.id}.json`);
        const fileExists = yield* fs
          .exists(filePath)
          .pipe(TerminalError.mapTo(`Failed to check if terminal exists at path ${filePath}`));

        if (!fileExists) {
          yield* new TerminalError({ message: `Terminal with id ${input.id} not found` });
        }

        const content = yield* fs
          .readFileString(filePath)
          .pipe(TerminalError.mapTo(`Failed to read terminal at path ${filePath}`));
        const decodeUnknown = Schema.decodeUnknownEffect(
          Schema.fromJsonString(TerminalMetadataSchema),
        );
        const current = yield* decodeUnknown(content).pipe(
          TerminalError.mapTo(`Failed to decode terminal`),
        );

        const updated: TerminalMetadata = {
          ...current,
          name: input.name,
          updatedAt: new Date().toISOString(),
        };

        yield* fs
          .writeFileString(filePath, JSON.stringify(updated, null, 2))
          .pipe(
            TerminalError.mapTo(
              `Failed to update terminal with id ${input.id} at path ${filePath}`,
            ),
          );

        return Option.some(updated);
      });

      const deleteTerminal = Effect.fn("TerminalService.deleteTerminal")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(TerminalError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new TerminalError({ message: `Project with id ${input.projectId} not found` });
          return false;
        }

        const filePath = path.join(project.value.path, "terminals", `${input.id}.json`);
        const fileExists = yield* fs
          .exists(filePath)
          .pipe(TerminalError.mapTo(`Failed to check if terminal exists at path ${filePath}`));

        if (!fileExists) {
          yield* new TerminalError({ message: `Terminal with id ${input.id} not found` });
          return false;
        }

        yield* fs
          .remove(filePath)
          .pipe(
            TerminalError.mapTo(
              `Failed to delete terminal with id ${input.id} at path ${filePath}`,
            ),
          );

        return true;
      });

      const listTerminals = Effect.fn("TerminalService.listTerminals")(function* (
        input: ListTerminalsInput,
      ) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(TerminalError.mapTo(`Failed to get project with id ${input.projectId}`));

        if (Option.isNone(project)) {
          yield* new TerminalError({ message: `Project with id ${input.projectId} not found` });
          return [];
        }

        const terminalsPath = path.join(project.value.path, "terminals");
        const exists = yield* fs
          .exists(terminalsPath)
          .pipe(
            TerminalError.mapTo(
              `Failed to check if terminals path exists at path ${terminalsPath}`,
            ),
          );

        if (!exists) return [];

        const entries = yield* fs
          .readDirectory(terminalsPath)
          .pipe(TerminalError.mapTo(`Failed to read terminals directory at path ${terminalsPath}`));
        const terminalFiles = entries.filter((e) => e.endsWith(".json"));

        if (terminalFiles.length === 0) return [];

        const terminals = yield* Effect.all(
          terminalFiles.map((file) =>
            fs.readFileString(path.join(terminalsPath, file)).pipe(
              // TODO: ignore invalid configs for now, might need better handling
              Effect.flatMap((content) =>
                decodeTerminal(content).pipe(Effect.mapError(() => null)),
              ),
              TerminalError.mapTo(
                `Failed to read terminal at path ${path.join(terminalsPath, file)}`,
              ),
            ),
          ),
          { concurrency: "unbounded" },
        );

        return terminals.filter((terminal) => terminal !== null);
      });

      return { createTerminal, updateTerminal, deleteTerminal, listTerminals } as const;
    }),
  },
) {
  static layer = Layer.effect(TerminalService, TerminalService.make);
  static live = TerminalService.layer.pipe(
    Layer.provideMerge(ProjectService.layer),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
