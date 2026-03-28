import { Effect, Layer, Option, ServiceMap } from "effect";
import {
  TerminalMetadata,
  TerminalMetadataSchema,
  CreateTerminalInput,
  UpdateTerminalInput,
  EntityService,
} from "@pixxl/shared";
import {
  TerminalNotFoundError,
  TerminalCreateError,
  TerminalUpdateError,
  TerminalDeleteError,
} from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { terminalManager } from "./manager";

type TerminalServiceShape = {
  readonly createTerminal: (
    input: CreateTerminalInput,
  ) => Effect.Effect<Option.Option<TerminalMetadata>, TerminalCreateError>;
  readonly getTerminal: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<Option.Option<TerminalMetadata>, TerminalNotFoundError>;
  readonly updateTerminal: (
    input: UpdateTerminalInput,
  ) => Effect.Effect<Option.Option<TerminalMetadata>, TerminalUpdateError>;
  readonly deleteTerminal: (input: {
    projectId: string;
    id: string;
  }) => Effect.Effect<boolean, TerminalDeleteError>;
  readonly listTerminals: (input: {
    projectId: string;
  }) => Effect.Effect<TerminalMetadata[], never>;
};

export class TerminalService extends ServiceMap.Service<TerminalService, TerminalServiceShape>()(
  "@pixxl/TerminalService",
  {
    make: Effect.gen(function* () {
      const entity = yield* EntityService;
      const project = yield* ProjectService;

      const terminals = entity.forEntity<TerminalMetadata, CreateTerminalInput>({
        directoryName: "terminals",
        schema: TerminalMetadataSchema,
        create: ({ id, now, name, themeId, fontId, fontSize }) => ({
          id,
          name,
          themeId: themeId ?? "catppuccin-mocha",
          fontId: fontId ?? "jetbrains-mono",
          fontSize: fontSize ?? 14,
          createdAt: now,
          updatedAt: now,
        }),
        update: (current, { now, name, themeId, fontId, fontSize }) => ({
          ...current,
          name,
          themeId: themeId ?? current.themeId,
          fontId: fontId ?? current.fontId,
          fontSize: fontSize ?? current.fontSize,
          updatedAt: now,
        }),
      });

      const createTerminal = Effect.fn("TerminalService.createTerminal")(function* (
        input: CreateTerminalInput,
      ) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        const terminal = yield* terminals
          .create({
            projectPath: projectResult.value.path,
            id: input.id,
            name: input.name,
            projectId: input.projectId,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new TerminalCreateError({
                  name: input.name,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );

        return Option.some(terminal);
      });

      const getTerminal = Effect.fn("TerminalService.getTerminal")(function* (input: {
        projectId: string;
        id: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        return yield* terminals
          .get({
            projectPath: projectResult.value.path,
            id: input.id,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new TerminalNotFoundError({
                  terminalId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );
      });

      const updateTerminal = Effect.fn("TerminalService.updateTerminal")(function* (
        input: UpdateTerminalInput,
      ) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.none();
        }

        return yield* terminals
          .update({
            projectPath: projectResult.value.path,
            id: input.id,
            name: input.name,
            projectId: input.projectId,
            themeId: input.themeId,
            fontId: input.fontId,
            fontSize: input.fontSize,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new TerminalUpdateError({
                  terminalId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );
      });

      const deleteTerminal = Effect.fn("TerminalService.deleteTerminal")(function* (input: {
        projectId: string;
        id: string;
      }) {
        terminalManager.remove(input.id);

        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return Option.some(false); // Return false instead of none for consistent typing
        }

        const deleted = yield* terminals
          .delete({
            projectPath: projectResult.value.path,
            id: input.id,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new TerminalDeleteError({
                  terminalId: input.id,
                  projectId: input.projectId,
                  cause,
                }),
            ),
          );

        return Option.some(deleted);
      });

      const listTerminals = Effect.fn("TerminalService.listTerminals")(function* (input: {
        projectId: string;
      }) {
        const projectResult = yield* project.getProjectDetail({ id: input.projectId });

        if (Option.isNone(projectResult)) {
          return [];
        }

        return yield* terminals.list({
          projectPath: projectResult.value.path,
        });
      });

      return {
        createTerminal,
        getTerminal,
        updateTerminal,
        deleteTerminal,
        listTerminals,
      } as unknown as TerminalServiceShape;
    }),
  },
) {
  static layer = Layer.effect(TerminalService, TerminalService.make).pipe(
    Layer.provideMerge(EntityService.layer),
    Layer.provideMerge(ProjectService.live),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
