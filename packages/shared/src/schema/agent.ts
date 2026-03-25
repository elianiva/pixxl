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

export const GetAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
});

export const PiMetadataSchema = Schema.Struct({
  sessionFile: Schema.String,
});

export const AgentMetadataSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  pi: PiMetadataSchema,
});

export const ListAgentsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

export const AgentMetadataListSchema = Schema.Array(AgentMetadataSchema);

// Agent session attachment schemas
export const AttachSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  sessionFile: Schema.String,
});

export const SwitchSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  sessionFile: Schema.String,
});

export const ListAttachableSessionsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

// Prompt and queue schemas - agent-centric
export const PromptAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
});

export const QueueSteerInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
});

export const QueueFollowUpInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
});

export const GetAgentRuntimeInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

// Pi session info schema (for listing attachable sessions)
export const PiSessionInfoSchema = Schema.Struct({
  path: Schema.String,
  id: Schema.String,
  cwd: Schema.String,
  name: Schema.optionalKey(Schema.String),
  parentSessionPath: Schema.optionalKey(Schema.String),
  created: Schema.Date,
  modified: Schema.Date,
  messageCount: Schema.Number,
  firstMessage: Schema.String,
});

export const PiSessionInfoListSchema = Schema.Array(PiSessionInfoSchema);

// Legacy session schemas - deprecated, will be removed
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

// Agent runtime state schema
export const AgentRuntimeStateSchema = Schema.Struct({
  agentId: Schema.String,
  projectId: Schema.String,
  status: Schema.Literals(["idle", "streaming", "switchingSession", "error"]),
  queuedSteering: Schema.Array(Schema.String),
  queuedFollowUp: Schema.Array(Schema.String),
  currentSessionFile: Schema.String,
});

// Legacy schemas - keeping for backward compatibility during transition
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
export type GetAgentInput = typeof GetAgentInputSchema.Type;
export type UpdateAgentInput = typeof UpdateAgentInputSchema.Type;
export type DeleteAgentInput = typeof DeleteAgentInputSchema.Type;
export type AgentMetadata = typeof AgentMetadataSchema.Type;
export type AgentMetadataList = typeof AgentMetadataListSchema.Type;
export type ListAgentsInput = typeof ListAgentsInputSchema.Type;
export type AttachSessionInput = typeof AttachSessionInputSchema.Type;
export type SwitchSessionInput = typeof SwitchSessionInputSchema.Type;
export type ListAttachableSessionsInput = typeof ListAttachableSessionsInputSchema.Type;
export type PromptAgentInput = typeof PromptAgentInputSchema.Type;
export type QueueSteerInput = typeof QueueSteerInputSchema.Type;
export type QueueFollowUpInput = typeof QueueFollowUpInputSchema.Type;
export type GetAgentRuntimeInput = typeof GetAgentRuntimeInputSchema.Type;
export type PiSessionInfo = typeof PiSessionInfoSchema.Type;
export type PiSessionInfoList = typeof PiSessionInfoListSchema.Type;
export type AgentRuntimeState = typeof AgentRuntimeStateSchema.Type;
// Legacy types
export type CreateSessionInput = typeof CreateSessionInputSchema.Type;
export type GetSessionInput = typeof GetSessionInputSchema.Type;
export type ListSessionsInput = typeof ListSessionsInputSchema.Type;
export type TerminateSessionInput = typeof TerminateSessionInputSchema.Type;
export type PromptInput = typeof PromptInputSchema.Type;
export type AgentSession = typeof AgentSessionSchema.Type;
export type AgentSessionList = typeof AgentSessionListSchema.Type;
export type AgentEvent = typeof AgentEventSchema.Type;
