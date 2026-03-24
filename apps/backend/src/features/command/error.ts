import { Schema } from "effect";

/**
 * Command not found by ID
 */
export class CommandNotFoundError extends Schema.TaggedErrorClass<CommandNotFoundError>()(
  "CommandNotFoundError",
  {
    commandId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to create command
 */
export class CommandCreateError extends Schema.TaggedErrorClass<CommandCreateError>()(
  "CommandCreateError",
  {
    name: Schema.optionalKey(Schema.String),
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to delete command
 */
export class CommandDeleteError extends Schema.TaggedErrorClass<CommandDeleteError>()(
  "CommandDeleteError",
  {
    commandId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Command execution failed
 */
export class CommandExecutionError extends Schema.TaggedErrorClass<CommandExecutionError>()(
  "CommandExecutionError",
  {
    commandId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    exitCode: Schema.optionalKey(Schema.Number),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Union of all command errors
 */
export type CommandError =
  | CommandNotFoundError
  | CommandCreateError
  | CommandDeleteError
  | CommandExecutionError;

/**
 * Type guard for command errors
 */
export const isCommandError = (error: unknown): error is CommandError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error._tag === "CommandNotFoundError" ||
    error._tag === "CommandCreateError" ||
    error._tag === "CommandDeleteError" ||
    error._tag === "CommandExecutionError");
