import { Effect, FileSystem, Layer, Path, Schema, ServiceMap } from "effect";
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
import { nanoid } from "nanoid";

function generateId(): string {
  const id = nanoid(8);
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

type CommandServiceShape = {
  readonly createCommand: (
    input: CreateCommandInput,
  ) => Effect.Effect<CommandMetadata, CommandError>;
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

      const createCommand = Effect.fn("CommandService.createCommand")(function* (
        input: CreateCommandInput,
      ) {
        const projects = yield* projectService.listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new CommandError({ message: `Project with id ${input.projectId} not found` });
        }

        const commandsPath = path.join(project.path, "commands");
        const exists = yield* fs.exists(commandsPath);

        if (!exists) {
          yield* fs.makeDirectory(commandsPath, { recursive: true });
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

        yield* fs.writeFileString(
          path.join(commandsPath, `${id}.json`),
          JSON.stringify(metadata, null, 2),
        );

        return metadata;
      });

      const listCommands = Effect.fn("CommandService.listCommands")(function* (
        input: ListCommandsInput,
      ) {
        const projects = yield* projectService.listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new CommandError({ message: `Project with id ${input.projectId} not found` });
        }

        const commandsPath = path.join(project.path, "commands");
        const exists = yield* fs.exists(commandsPath);

        if (!exists) {
          return [];
        }

        const entries = yield* fs.readDirectory(commandsPath);
        const commandFiles = entries.filter((e) => e.endsWith(".json"));

        if (commandFiles.length === 0) {
          return [];
        }

        const decodeCommand = Schema.decodeUnknownEffect(
          Schema.fromJsonString(CommandMetadataSchema),
        );

        const commands = yield* Effect.all(
          commandFiles.map((file) =>
            fs.readFileString(path.join(commandsPath, file)).pipe(
              Effect.flatMap((content) => decodeCommand(content)),
            ),
          ),
          { concurrency: "unbounded" },
        );

        return commands;
      });

      return { createCommand, listCommands } as const;
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
