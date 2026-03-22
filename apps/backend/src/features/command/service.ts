import { Effect, FileSystem, Layer, Option, Path, Schema, ServiceMap } from "effect";
import {
  CommandMetadata,
  CommandMetadataSchema,
  CreateCommandInput,
  ListCommandsInput,
} from "@pixxl/shared";
import { CommandError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { generateId } from "@/utils/id";

type CommandServiceShape = {
  readonly createCommand: (
    input: CreateCommandInput,
  ) => Effect.Effect<Option.Option<CommandMetadata>, CommandError>;
  readonly deleteCommand: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<boolean, CommandError>;
  readonly listCommands: (
    input: ListCommandsInput,
  ) => Effect.Effect<CommandMetadata[], CommandError>;
};

export class CommandService extends ServiceMap.Service<CommandService, CommandServiceShape>()(
  "@pixxl/CommandService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const projectService = yield* ProjectService;

      const decodeCommand = Schema.decodeUnknownEffect(
        Schema.fromJsonString(CommandMetadataSchema),
      );

      const createCommand = Effect.fn("CommandService.createCommand")(function* (
        input: CreateCommandInput,
      ) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(CommandError.mapTo(`Failed to get project detail`));

        if (Option.isNone(project)) {
          yield* new CommandError({ message: `Project with id ${input.projectId} not found` });
          return Option.none();
        }

        const commandsPath = path.join(project.value.path, "commands");
        const exists = yield* fs
          .exists(commandsPath)
          .pipe(CommandError.mapTo(`Failed to check if path exists`));

        if (!exists) {
          yield* fs
            .makeDirectory(commandsPath, { recursive: true })
            .pipe(CommandError.mapTo(`Failed to create directory at path ${commandsPath}`));
          return Option.none();
        }

        const id = generateId();
        const now = new Date().toISOString();
        const metadata: CommandMetadata = {
          id,
          name: input.name,
          command: input.command,
          description: input.description ?? "",
          createdAt: now,
          updatedAt: now,
        };

        yield* fs
          .writeFileString(path.join(commandsPath, `${id}.json`), JSON.stringify(metadata, null, 2))
          .pipe(
            CommandError.mapTo(
              `Failed to write file at path ${path.join(commandsPath, `${id}.json`)}`,
            ),
          );

        return Option.some(metadata);
      });

      const deleteCommand = Effect.fn("CommandService.deleteCommand")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(CommandError.mapTo(`Failed to get project detail`));

        if (Option.isNone(project)) {
          yield* new CommandError({ message: `Project with id ${input.projectId} not found` });
          return false;
        }

        const filePath = path.join(project.value.path, "commands", `${input.id}.json`);
        const fileExists = yield* fs
          .exists(filePath)
          .pipe(CommandError.mapTo(`Failed to check if command exists at path ${filePath}`));

        if (!fileExists) {
          yield* new CommandError({ message: `Command with id ${input.id} not found` });
          return false;
        }

        yield* fs
          .remove(filePath)
          .pipe(
            CommandError.mapTo(`Failed to delete command with id ${input.id} at path ${filePath}`),
          );

        return true;
      });

      const listCommands = Effect.fn("CommandService.listCommands")(function* (
        input: ListCommandsInput,
      ) {
        const project = yield* projectService
          .getProjectDetail({ id: input.projectId })
          .pipe(CommandError.mapTo(`Failed to get project detail`));

        if (Option.isNone(project)) {
          yield* new CommandError({ message: `Project with id ${input.projectId} not found` });
          return [];
        }

        const commandsPath = path.join(project.value.path, "commands");
        const exists = yield* fs
          .exists(commandsPath)
          .pipe(CommandError.mapTo(`Failed to check path at ${commandsPath}`));

        if (!exists) return [];

        const entries = yield* fs
          .readDirectory(commandsPath)
          .pipe(CommandError.mapTo(`Failed to read directory at ${commandsPath}`));
        const commandFiles = entries.filter((e) => e.endsWith(".json"));

        if (commandFiles.length === 0) return [];

        const commands = yield* Effect.all(
          commandFiles.map((file) =>
            fs.readFileString(path.join(commandsPath, file)).pipe(
              // TODO: ignore invalid configs for now, might need better handling
              Effect.flatMap((content) => decodeCommand(content).pipe(Effect.mapError(() => null))),
              CommandError.mapTo(`Failed to read command at path ${path.join(commandsPath, file)}`),
            ),
          ),
          { concurrency: "unbounded" },
        );

        return commands.filter((command) => command !== null);
      });

      return { createCommand, deleteCommand, listCommands } as const;
    }),
  },
) {
  static layer = Layer.effect(CommandService, CommandService.make);
  static live = CommandService.layer.pipe(
    Layer.provideMerge(ProjectService.layer),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
