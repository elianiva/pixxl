import { Effect, Layer, Option, ServiceMap } from "effect";
import {
  CommandMetadata,
  CommandMetadataSchema,
  CreateCommandInput,
  ListCommandsInput,
  EntityService,
} from "@pixxl/shared";
import { CommandNotFoundError, CommandCreateError, CommandDeleteError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";

type CommandServiceShape = {
  readonly createCommand: (
    input: CreateCommandInput,
  ) => Effect.Effect<Option.Option<CommandMetadata>, CommandCreateError>;
  readonly getCommand: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<Option.Option<CommandMetadata>, CommandNotFoundError>;
  readonly deleteCommand: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<Option.Option<boolean>, CommandDeleteError>;
  readonly listCommands: (input: ListCommandsInput) => Effect.Effect<CommandMetadata[], never>;
};

export class CommandService extends ServiceMap.Service<CommandService, CommandServiceShape>()(
  "@pixxl/CommandService",
  {
    make: Effect.gen(function* () {
      const entity = yield* EntityService;
      const project = yield* ProjectService;

      const commands = entity.forEntity<CommandMetadata, CreateCommandInput>({
        directoryName: "commands",
        schema: CommandMetadataSchema,
        create: ({ id, now, name, command, description }) => ({
          id,
          name,
          command,
          description,
          createdAt: now,
          updatedAt: now,
        }),
        update: (current, { now, ...patch }) => ({
          ...current,
          ...patch,
          updatedAt: now,
        }),
      });

      const createCommand = Effect.fn("CommandService.createCommand")(function* (
        input: CreateCommandInput,
      ) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        const command = yield* commands
          .create({
            projectPath: projectResult.value.path,
            id: input.id,
            name: input.name,
            projectId: input.projectId,
            command: input.command,
            description: input.description,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new CommandCreateError({
                  name: input.name,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );

        return Option.some(command);
      });

      const getCommand = Effect.fn("CommandService.getCommand")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        return yield* commands
          .get({
            projectPath: projectResult.value.path,
            id: input.id,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new CommandNotFoundError({
                  commandId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );
      });

      const deleteCommand = Effect.fn("CommandService.deleteCommand")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none<boolean>();
        }

        return yield* commands
          .delete({
            projectPath: projectResult.value.path,
            id: input.id,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new CommandDeleteError({
                  commandId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );
      });

      const listCommands = Effect.fn("CommandService.listCommands")(function* (
        input: ListCommandsInput,
      ) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return [];
        }

        return yield* commands.list({
          projectPath: projectResult.value.path,
        });
      });

      return { createCommand, getCommand, deleteCommand, listCommands } as unknown as CommandServiceShape;
    }),
  },
) {
  static layer = Layer.effect(CommandService, CommandService.make).pipe(
    Layer.provideMerge(EntityService.layer),
    Layer.provideMerge(ProjectService.live),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
