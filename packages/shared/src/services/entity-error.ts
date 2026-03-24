import { Schema } from "effect";

/**
 * Entity file not found
 */
export class EntityNotFoundError extends Schema.TaggedErrorClass<EntityNotFoundError>()(
  "EntityNotFoundError",
  {
    entityId: Schema.String,
    directory: Schema.String,
  },
) {}

/**
 * Failed to decode entity from JSON
 */
export class EntityDecodeError extends Schema.TaggedErrorClass<EntityDecodeError>()(
  "EntityDecodeError",
  {
    entityId: Schema.String,
    directory: Schema.String,
  },
) {}

/**
 * Failed to encode entity to JSON
 */
export class EntityEncodeError extends Schema.TaggedErrorClass<EntityEncodeError>()(
  "EntityEncodeError",
  {
    entityId: Schema.optionalKey(Schema.String),
    directory: Schema.String,
  },
) {}

/**
 * Failed to read entity directory
 */
export class EntityDirectoryError extends Schema.TaggedErrorClass<EntityDirectoryError>()(
  "EntityDirectoryError",
  {
    directory: Schema.String,
    operation: Schema.String,
  },
) {}

/**
 * Failed to read entity file
 */
export class EntityFileReadError extends Schema.TaggedErrorClass<EntityFileReadError>()(
  "EntityFileReadError",
  {
    filePath: Schema.String,
  },
) {}

/**
 * Failed to write entity file
 */
export class EntityFileWriteError extends Schema.TaggedErrorClass<EntityFileWriteError>()(
  "EntityFileWriteError",
  {
    filePath: Schema.String,
  },
) {}

/**
 * Union of all entity service errors
 */
export type EntityServiceError =
  | EntityNotFoundError
  | EntityDecodeError
  | EntityEncodeError
  | EntityDirectoryError
  | EntityFileReadError
  | EntityFileWriteError;
