import { Schema } from "effect";

/** Agent not found by ID */
export class AgentNotFoundError extends Schema.TaggedErrorClass<AgentNotFoundError>()(
  "AgentNotFoundError",
  {
    agentId: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/** Failed to create agent - wraps Pi session or storage errors */
export class AgentCreateError extends Schema.TaggedErrorClass<AgentCreateError>()(
  "AgentCreateError",
  {
    name: Schema.String,
    cause: Schema.Unknown,
  },
) {}

/** Failed to update agent */
export class AgentUpdateError extends Schema.TaggedErrorClass<AgentUpdateError>()(
  "AgentUpdateError",
  {
    agentId: Schema.String,
    cause: Schema.Unknown,
  },
) {}

/** Failed to delete agent */
export class AgentDeleteError extends Schema.TaggedErrorClass<AgentDeleteError>()(
  "AgentDeleteError",
  {
    agentId: Schema.String,
    cause: Schema.Unknown,
  },
) {}

/** Session operation failed */
export class SessionError extends Schema.TaggedErrorClass<SessionError>()("SessionError", {
  agentId: Schema.String,
  operation: Schema.String,
  cause: Schema.Unknown,
}) {}

/** Prompt operation failed (streaming) */
export class PromptError extends Schema.TaggedErrorClass<PromptError>()("PromptError", {
  agentId: Schema.String,
  cause: Schema.Unknown,
}) {}
