import { Schema } from "effect";

/**
 * Terminal not found by ID
 */
export class TerminalNotFoundError extends Schema.TaggedErrorClass<TerminalNotFoundError>()(
  "TerminalNotFoundError",
  {
    terminalId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to create terminal
 */
export class TerminalCreateError extends Schema.TaggedErrorClass<TerminalCreateError>()(
  "TerminalCreateError",
  {
    name: Schema.optionalKey(Schema.String),
    shell: Schema.optionalKey(Schema.String),
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to update terminal
 */
export class TerminalUpdateError extends Schema.TaggedErrorClass<TerminalUpdateError>()(
  "TerminalUpdateError",
  {
    terminalId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to delete terminal
 */
export class TerminalDeleteError extends Schema.TaggedErrorClass<TerminalDeleteError>()(
  "TerminalDeleteError",
  {
    terminalId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Terminal connection error (shell process, PTY, etc)
 */
export class TerminalConnectionError extends Schema.TaggedErrorClass<TerminalConnectionError>()(
  "TerminalConnectionError",
  {
    terminalId: Schema.String,
    command: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Union of all terminal errors
 */
export type TerminalError =
  | TerminalNotFoundError
  | TerminalCreateError
  | TerminalUpdateError
  | TerminalDeleteError
  | TerminalConnectionError;

/**
 * Type guard for terminal errors
 */
export const isTerminalError = (error: unknown): error is TerminalError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error._tag === "TerminalNotFoundError" ||
    error._tag === "TerminalCreateError" ||
    error._tag === "TerminalUpdateError" ||
    error._tag === "TerminalDeleteError" ||
    error._tag === "TerminalConnectionError");
