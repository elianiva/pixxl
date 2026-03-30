import { Effect, FileSystem, Layer, Option, Path, Schema, ServiceMap } from "effect";
import {
  EntityDecodeError,
  EntityDirectoryError,
  EntityFileReadError,
  EntityFileWriteError,
  type EntityServiceError,
} from "./entity-error";

/** Minimal metadata required by all entities stored on disk */
export type EntityMetadata = {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/**
 * Base path for storing pixxl entities (agents, terminals, commands).
 * This is the workspace storage path, NOT the user's actual project path.
 */
export type EntityBasePath = string;

/** Input params for creating an entity */
export type CreateEntityInput = {
  readonly id: string;
  /** Base path in workspace storage where entities are stored */
  readonly entityBasePath: EntityBasePath;
};

/** Input params for reading an entity */
export type GetEntityInput = {
  /** Base path in workspace storage where entities are stored */
  readonly entityBasePath: EntityBasePath;
  readonly id: string;
};

/** Input params for updating an entity */
export type UpdateEntityInput = {
  readonly id: string;
  /** Base path in workspace storage where entities are stored */
  readonly entityBasePath: EntityBasePath;
};

/** Input params for deleting an entity */
export type DeleteEntityInput = {
  /** Base path in workspace storage where entities are stored */
  readonly entityBasePath: EntityBasePath;
  readonly id: string;
};

/** Input params for listing entities */
export type ListEntityInput = {
  /** Base path in workspace storage where entities are stored */
  readonly entityBasePath: EntityBasePath;
};

/** Definition for a specific entity type */
export type EntityDefinition<
  TEntity extends EntityMetadata,
  TCreate extends object,
  TUpdate extends object = TCreate,
> = {
  readonly directoryName: string;
  readonly schema: Schema.Schema<TEntity>;
  readonly create: (input: TCreate & { readonly id: string; readonly now: string }) => TEntity;
  readonly update: (current: TEntity, input: TUpdate & { readonly now: string }) => TEntity;
};

/** CRUD operations exposed by EntityService.forEntity */
export type EntityOperations<TEntity, TCreate extends object, TUpdate extends object = TCreate> = {
  readonly create: (
    input: TCreate & CreateEntityInput,
  ) => Effect.Effect<TEntity, EntityServiceError>;
  readonly get: (
    input: GetEntityInput,
  ) => Effect.Effect<Option.Option<TEntity>, EntityServiceError>;
  readonly update: (
    input: TUpdate & UpdateEntityInput,
  ) => Effect.Effect<Option.Option<TEntity>, EntityServiceError>;
  readonly delete: (input: DeleteEntityInput) => Effect.Effect<boolean, EntityServiceError>;
  readonly list: (input: ListEntityInput) => Effect.Effect<Array<TEntity>, EntityServiceError>;
};

type EntityServiceShape = {
  readonly forEntity: <
    TEntity extends EntityMetadata,
    TCreate extends object,
    TUpdate extends object = TCreate,
  >(
    definition: EntityDefinition<TEntity, TCreate, TUpdate>,
  ) => EntityOperations<TEntity, TCreate, TUpdate>;
};

const mapFsError = (error: unknown, makeError: (_msg: string) => EntityServiceError) => {
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
        TCreate extends object,
        TUpdate extends object = TCreate,
      >(
        definition: EntityDefinition<TEntity, TCreate, TUpdate>,
      ): EntityOperations<TEntity, TCreate, TUpdate> => {
        const entityPath = (basePath: EntityBasePath) =>
          path.join(basePath, definition.directoryName);

        const filePath = (basePath: EntityBasePath, id: string) =>
          path.join(entityPath(basePath), `${id}.json`);

        const decodeEntity = Schema.decodeUnknownEffect(
          Schema.fromJsonString(definition.schema),
        ) as (content: string) => Effect.Effect<TEntity, unknown, never>;

        const create = Effect.fn("EntityService.create")(function* (
          input: TCreate & CreateEntityInput,
        ) {
          const directoryPath = entityPath(input.entityBasePath);

          const dirExists = yield* fs
            .exists(directoryPath)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(
                  _e,
                  (_msg) =>
                    new EntityDirectoryError({ directory: directoryPath, operation: "check" }),
                ),
              ),
            );

          if (!dirExists) {
            yield* fs
              .makeDirectory(directoryPath, { recursive: true })
              .pipe(
                Effect.mapError((_e) =>
                  mapFsError(
                    _e,
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

          const fp = filePath(input.entityBasePath, entity.id);
          const content = JSON.stringify(entity, null, 2);

          yield* fs
            .writeFileString(fp, content)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileWriteError({ filePath: fp })),
              ),
            );

          return entity;
        });

        const get = Effect.fn("EntityService.get")(function* (input: GetEntityInput) {
          const fp = filePath(input.entityBasePath, input.id);

          const fileExists = yield* fs
            .exists(fp)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          if (!fileExists) {
            return Option.none<TEntity>();
          }

          const content = yield* fs
            .readFileString(fp)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          const entity = yield* decodeEntity(content).pipe(
            Effect.mapError(
              (_e) =>
                new EntityDecodeError({
                  entityId: input.id,
                  directory: entityPath(input.entityBasePath),
                }),
            ),
          );

          return Option.some(entity);
        });

        const update = Effect.fn("EntityService.update")(function* (
          input: TUpdate & UpdateEntityInput,
        ) {
          const fp = filePath(input.entityBasePath, input.id);

          const fileExists = yield* fs
            .exists(fp)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          if (!fileExists) {
            return Option.none<TEntity>();
          }

          const content = yield* fs
            .readFileString(fp)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          const current = yield* decodeEntity(content).pipe(
            Effect.mapError(
              (_e) =>
                new EntityDecodeError({
                  entityId: input.id,
                  directory: entityPath(input.entityBasePath),
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
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileWriteError({ filePath: fp })),
              ),
            );

          return Option.some(entity);
        });

        const remove = Effect.fn("EntityService.delete")(function* (input: DeleteEntityInput) {
          const fp = filePath(input.entityBasePath, input.id);

          const fileExists = yield* fs
            .exists(fp)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileReadError({ filePath: fp })),
              ),
            );

          if (!fileExists) return false;

          yield* fs
            .remove(fp)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(_e, (_msg) => new EntityFileWriteError({ filePath: fp })),
              ),
            );

          return true;
        });

        const list = Effect.fn("EntityService.list")(function* (input: ListEntityInput) {
          const directoryPath = entityPath(input.entityBasePath);

          const dirExists = yield* fs
            .exists(directoryPath)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(
                  _e,
                  (_msg) =>
                    new EntityDirectoryError({ directory: directoryPath, operation: "check" }),
                ),
              ),
            );

          if (!dirExists) return [];

          const entries = yield* fs
            .readDirectory(directoryPath)
            .pipe(
              Effect.mapError((_e) =>
                mapFsError(
                  _e,
                  (_msg) =>
                    new EntityDirectoryError({ directory: directoryPath, operation: "read" }),
                ),
              ),
            );

          const files = entries.filter((entry) => entry.endsWith(".json"));
          if (files.length === 0) return [];

          return yield* Effect.all(
            files.map((file) =>
              fs.readFileString(path.join(directoryPath, file)).pipe(
                Effect.mapError((_e) => new EntityFileReadError({ filePath: file })),
                Effect.flatMap((content) =>
                  decodeEntity(content).pipe(
                    Effect.mapError(
                      (_e) => new EntityDecodeError({ entityId: file, directory: directoryPath }),
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
