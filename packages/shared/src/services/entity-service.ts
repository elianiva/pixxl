import { Effect, FileSystem, Layer, Option, Path, Schema, ServiceMap } from "effect";
import { generateId } from "../utils";
import {
  EntityNotFoundError,
  EntityDecodeError,
  EntityEncodeError,
  EntityDirectoryError,
  EntityFileReadError,
  EntityFileWriteError,
  type EntityServiceError,
} from "./entity-error";

export type EntityMetadata = {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// projectPath is passed separately to create/update operations, not in the input type
export type EntityDefinition<TEntity extends EntityMetadata, TCreate, TUpdate = TCreate> = {
  readonly directoryName: string;
  readonly schema: Schema.Schema<TEntity>;
  readonly create: (input: TCreate & { readonly id: string; readonly now: string }) => TEntity;
  readonly update: (current: TEntity, input: TUpdate & { readonly now: string }) => TEntity;
};

export type EntityOperations<TEntity, TCreate, TUpdate = TCreate> = {
  readonly create: (
    input: TCreate & { readonly id: string; readonly projectPath: string },
  ) => Effect.Effect<TEntity, EntityServiceError>;
  readonly get: (input: {
    readonly projectPath: string;
    readonly id: string;
  }) => Effect.Effect<Option.Option<TEntity>, EntityServiceError>;
  readonly update: (
    input: TUpdate & { readonly id: string; readonly projectPath: string },
  ) => Effect.Effect<Option.Option<TEntity>, EntityServiceError>;
  readonly delete: (input: {
    readonly projectPath: string;
    readonly id: string;
  }) => Effect.Effect<Option.Option<boolean>, EntityServiceError>;
  readonly list: (input: {
    readonly projectPath: string;
  }) => Effect.Effect<Array<TEntity>, EntityServiceError>;
};

type EntityServiceShape = {
  readonly forEntity: <
    TEntity extends EntityMetadata,
    TCreate extends CreateInputBase,
    TUpdate extends CreateInputBase = TCreate,
  >(
    definition: EntityDefinition<TEntity, TCreate, TUpdate>,
  ) => EntityOperations<TEntity, TCreate, TUpdate>;
};

/**
 * Helper to map file system errors to entity errors
 */
const mapFsError = (error: unknown, makeError: (message: string) => EntityServiceError) => {
  const message = error instanceof Error ? error.message : String(error);
  return makeError(message);
};

export class EntityService extends ServiceMap.Service<EntityService, EntityServiceShape>()(
  "@pixxl/EntityService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const forEntity = <
        TEntity extends EntityMetadata,
        TCreate extends CreateInputBase,
        TUpdate extends CreateInputBase = TCreate,
      >(
        definition: EntityDefinition<TEntity, TCreate, TUpdate>,
      ): EntityOperations<TEntity, TCreate, TUpdate> => {
        const entityPath = (projectPath: string) =>
          path.join(projectPath, definition.directoryName);

        const filePath = (projectPath: string, id: string) =>
          path.join(entityPath(projectPath), `${id}.json`);

        const decodeEntity = Schema.decodeUnknownEffect(
          Schema.fromJsonString(definition.schema),
        ) as (content: string) => Effect.Effect<TEntity, unknown, never>;

        const create = Effect.fn("EntityService.create")(function* (
          projectPath: string,
          input: { readonly id: string } & TCreate,
        ) {
          const directoryPath = entityPath(projectPath);
          const dirExists = yield* fs
            .exists(directoryPath)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(
                  e,
                  (_msg) =>
                    new EntityDirectoryError({ directory: directoryPath, operation: "check" }),
                ),
              ),
            );

          if (!dirExists) {
            yield* fs
              .makeDirectory(directoryPath, { recursive: true })
              .pipe(
                Effect.mapError((e) =>
                  mapFsError(
                    e,
                    (_msg) =>
                      new EntityDirectoryError({ directory: directoryPath, operation: "create" }),
                  ),
                ),
              );
          }

          const now = new Date().toISOString();
          const entity = definition.create({
            ...input,
            id: input.id,
            now,
          });

          const fp = filePath(projectPath, entity.id);
          const content = JSON.stringify(entity, null, 2);

          yield* fs
            .writeFileString(fp, content)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (_msg) => new EntityFileWriteError({ filePath: fp })),
              ),
            );

          return entity;
        });

        const get = Effect.fn("EntityService.get")(function* (input: {
          readonly projectPath: string;
          readonly id: string;
        }) {
          const fp = filePath(input.projectPath, input.id);
          const fileExists = yield* fs
            .exists(fp)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          if (!fileExists) {
            return Option.none<TEntity>();
          }

          const content = yield* fs
            .readFileString(fp)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          const entity = yield* decodeEntity(content).pipe(
            Effect.mapError(
              (e) =>
                new EntityDecodeError({
                  entityId: input.id,
                  directory: entityPath(input.projectPath),
                }),
            ),
          );

          return Option.some(entity);
        });

        const update = Effect.fn("EntityService.update")(function* (
          input: { readonly id: string } & TUpdate,
        ) {
          const fp = filePath(input.projectPath, input.id);
          const fileExists = yield* fs
            .exists(fp)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          if (!fileExists) {
            return Option.none<TEntity>();
          }

          const content = yield* fs
            .readFileString(fp)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          const current = yield* decodeEntity(content).pipe(
            Effect.mapError(
              (e) =>
                new EntityDecodeError({
                  entityId: input.id,
                  directory: entityPath(input.projectPath),
                }),
            ),
          );

          const entity = definition.update(current, {
            ...input,
            now: new Date().toISOString(),
          });

          yield* fs
            .writeFileString(fp, JSON.stringify(entity, null, 2))
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (msg) => new EntityFileWriteError({ filePath: fp })),
              ),
            );

          return Option.some(entity);
        });

        const remove = Effect.fn("EntityService.delete")(function* (input: {
          readonly projectPath: string;
          readonly id: string;
        }) {
          const fp = filePath(input.projectPath, input.id);
          const fileExists = yield* fs
            .exists(fp)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          if (!fileExists) {
            return Option.none<boolean>();
          }

          yield* fs
            .remove(fp)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(e, (msg) => new EntityFileWriteError({ filePath: fp })),
              ),
            );

          return Option.some(true);
        });

        const list = Effect.fn("EntityService.list")(function* (input: {
          readonly projectPath: string;
        }) {
          const directoryPath = entityPath(input.projectPath);
          const dirExists = yield* fs
            .exists(directoryPath)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(
                  e,
                  (msg) =>
                    new EntityDirectoryError({ directory: directoryPath, operation: "check" }),
                ),
              ),
            );

          if (!dirExists) return [];

          const entries = yield* fs
            .readDirectory(directoryPath)
            .pipe(
              Effect.mapError((e) =>
                mapFsError(
                  e,
                  (msg) =>
                    new EntityDirectoryError({ directory: directoryPath, operation: "read" }),
                ),
              ),
            );

          const files = entries.filter((entry) => entry.endsWith(".json"));
          if (files.length === 0) return [];

          return yield* Effect.all(
            files.map((file) =>
              fs.readFileString(path.join(directoryPath, file)).pipe(
                Effect.mapError((e) => new EntityFileReadError({ filePath: file })),
                Effect.flatMap((content) =>
                  decodeEntity(content).pipe(
                    Effect.mapError(
                      (e) => new EntityDecodeError({ entityId: file, directory: directoryPath }),
                    ),
                  ),
                ),
              ),
            ),
            { concurrency: 10 },
          );
        });

        return { create, get, update, delete: remove, list };
      };

      return { forEntity } as const;
    }),
  },
) {
  static layer = Layer.effect(EntityService, EntityService.make);
  static live = EntityService.layer;
}

// Re-export entity errors for convenience
export {
  EntityNotFoundError,
  EntityDecodeError,
  EntityEncodeError,
  EntityDirectoryError,
  EntityFileReadError,
  EntityFileWriteError,
  type EntityServiceError,
};
export { generateId };
