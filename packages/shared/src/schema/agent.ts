import { Schema } from "effect";

export const CreateAgentInputSchema = Schema.Struct({
  id: Schema.String,
  projectId: Schema.String,
  name: Schema.NonEmptyString,
});

export const UpdateAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

export const DeleteAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
});

export const AgentMetadataSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const ListAgentsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

export const AgentMetadataListSchema = Schema.Array(AgentMetadataSchema);

// Session schemas
export const CreateSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  name: Schema.NonEmptyString,
  model: Schema.optionalKey(Schema.String),
  thinkingLevel: Schema.optionalKey(
    Schema.Literals(["off", "minimal", "low", "medium", "high", "xhigh"]),
  ),
});

export const GetSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  sessionId: Schema.String,
});

export const ListSessionsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

export const TerminateSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  sessionId: Schema.String,
});

export const PromptInputSchema = Schema.Struct({
  projectId: Schema.String,
  sessionId: Schema.String,
  text: Schema.String,
});

export const AgentSessionSchema = Schema.Struct({
  id: Schema.String,
  projectId: Schema.String,
  name: Schema.String,
  status: Schema.Literals(["idle", "streaming", "error"]),
  createdAt: Schema.Date,
});

export const AgentSessionListSchema = Schema.Array(AgentSessionSchema);

// Streaming event schemas
const MessageDeltaEventSchema = Schema.Struct({
  type: Schema.Literal("message_delta"),
  sessionId: Schema.String,
  delta: Schema.String,
});

const ThinkingDeltaEventSchema = Schema.Struct({
  type: Schema.Literal("thinking_delta"),
  sessionId: Schema.String,
  delta: Schema.String,
});

const ToolStartEventSchema = Schema.Struct({
  type: Schema.Literal("tool_start"),
  sessionId: Schema.String,
  toolName: Schema.String,
  params: Schema.Unknown,
});

const ToolUpdateEventSchema = Schema.Struct({
  type: Schema.Literal("tool_update"),
  sessionId: Schema.String,
  output: Schema.String,
});

const ToolEndEventSchema = Schema.Struct({
  type: Schema.Literal("tool_end"),
  sessionId: Schema.String,
  result: Schema.Unknown,
  error: Schema.optionalKey(Schema.String),
});

const StatusChangeEventSchema = Schema.Struct({
  type: Schema.Literal("status_change"),
  sessionId: Schema.String,
  status: Schema.Literals(["idle", "streaming", "error"]),
});

const ErrorEventSchema = Schema.Struct({
  type: Schema.Literal("error"),
  sessionId: Schema.String,
  message: Schema.String,
});

const SessionCreatedEventSchema = Schema.Struct({
  type: Schema.Literal("session_created"),
  sessionId: Schema.String,
  name: Schema.String,
});

const SessionClosedEventSchema = Schema.Struct({
  type: Schema.Literal("session_closed"),
  sessionId: Schema.String,
});

export const AgentEventSchema = Schema.Union([
  MessageDeltaEventSchema,
  ThinkingDeltaEventSchema,
  ToolStartEventSchema,
  ToolUpdateEventSchema,
  ToolEndEventSchema,
  StatusChangeEventSchema,
  ErrorEventSchema,
  SessionCreatedEventSchema,
  SessionClosedEventSchema,
]);

export type CreateAgentInput = typeof CreateAgentInputSchema.Type;
export type UpdateAgentInput = typeof UpdateAgentInputSchema.Type;
export type DeleteAgentInput = typeof DeleteAgentInputSchema.Type;
export type AgentMetadata = typeof AgentMetadataSchema.Type;
export type AgentMetadataList = typeof AgentMetadataListSchema.Type;
export type ListAgentsInput = typeof ListAgentsInputSchema.Type;
export type CreateSessionInput = typeof CreateSessionInputSchema.Type;
export type GetSessionInput = typeof GetSessionInputSchema.Type;
export type ListSessionsInput = typeof ListSessionsInputSchema.Type;
export type TerminateSessionInput = typeof TerminateSessionInputSchema.Type;
export type PromptInput = typeof PromptInputSchema.Type;
export type AgentSession = typeof AgentSessionSchema.Type;
export type AgentSessionList = typeof AgentSessionListSchema.Type;
export type AgentEvent = typeof AgentEventSchema.Type;
