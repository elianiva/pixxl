import { Schema } from "effect";

/**
 * Agent not found by ID
 */
export class AgentNotFoundError extends Schema.TaggedErrorClass<AgentNotFoundError>()(
  "AgentNotFoundError",
  {
    agentId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to create agent
 */
export class AgentCreateError extends Schema.TaggedErrorClass<AgentCreateError>()(
  "AgentCreateError",
  {
    name: Schema.optionalKey(Schema.String),
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to update agent
 */
export class AgentUpdateError extends Schema.TaggedErrorClass<AgentUpdateError>()(
  "AgentUpdateError",
  {
    agentId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to delete agent
 */
export class AgentDeleteError extends Schema.TaggedErrorClass<AgentDeleteError>()(
  "AgentDeleteError",
  {
    agentId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Session not found by ID
 */
export class SessionNotFoundError extends Schema.TaggedErrorClass<SessionNotFoundError>()(
  "SessionNotFoundError",
  {
    sessionId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to create agent session
 */
export class SessionCreateError extends Schema.TaggedErrorClass<SessionCreateError>()(
  "SessionCreateError",
  {
    name: Schema.optionalKey(Schema.String),
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to terminate agent session
 */
export class SessionTerminateError extends Schema.TaggedErrorClass<SessionTerminateError>()(
  "SessionTerminateError",
  {
    sessionId: Schema.String,
    projectId: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Failed to create Pi session file
 */
export class PiSessionCreateError extends Schema.TaggedErrorClass<PiSessionCreateError>()(
  "PiSessionCreateError",
  {
    sessionId: Schema.optionalKey(Schema.String),
    projectPath: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Pi session file validation failed
 */
export class PiSessionValidationError extends Schema.TaggedErrorClass<PiSessionValidationError>()(
  "PiSessionValidationError",
  {
    sessionFile: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Agent session attachment failed
 */
export class AgentAttachError extends Schema.TaggedErrorClass<AgentAttachError>()(
  "AgentAttachError",
  {
    agentId: Schema.String,
    projectId: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/**
 * Union of all agent errors
 */
export type AgentError =
  | AgentNotFoundError
  | AgentCreateError
  | AgentUpdateError
  | AgentDeleteError
  | SessionNotFoundError
  | SessionCreateError
  | SessionTerminateError
  | PiSessionCreateError
  | PiSessionValidationError
  | AgentAttachError;

/**
 * Type guard for agent errors
 */
export const isAgentError = (error: unknown): error is AgentError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error._tag === "AgentNotFoundError" ||
    error._tag === "AgentCreateError" ||
    error._tag === "AgentUpdateError" ||
    error._tag === "AgentDeleteError" ||
    error._tag === "SessionNotFoundError" ||
    error._tag === "SessionCreateError" ||
    error._tag === "SessionTerminateError" ||
    error._tag === "PiSessionCreateError" ||
    error._tag === "PiSessionValidationError" ||
    error._tag === "AgentAttachError");