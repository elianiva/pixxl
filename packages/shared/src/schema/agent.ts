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

// Prompt mode: how to handle if agent is already streaming
export const PromptModeSchema = Schema.Literals(["immediate", "steer", "followUp"]);

// Prompt schema - mode integrated into prompt
export const PromptAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
  mode: Schema.optionalKey(PromptModeSchema),
});

export const GetAgentRuntimeInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const GetAgentHistoryInputSchema = Schema.Struct({
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

// Agent runtime state schema
export const AgentRuntimeStateSchema = Schema.Struct({
  agentId: Schema.String,
  projectId: Schema.String,
  status: Schema.Literals(["idle", "streaming", "initializing", "switchingSession", "error"]),
  queuedSteering: Schema.Array(Schema.String),
  queuedFollowUp: Schema.Array(Schema.String),
  currentSessionFile: Schema.String,
});

const PiMessageEntrySchema = Schema.Struct({
  type: Schema.Literal("message"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  message: Schema.Unknown,
});

const PiModelChangeEntrySchema = Schema.Struct({
  type: Schema.Literal("model_change"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  provider: Schema.String,
  modelId: Schema.String,
});

const PiThinkingLevelChangeEntrySchema = Schema.Struct({
  type: Schema.Literal("thinking_level_change"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  thinkingLevel: Schema.String,
});

const PiCompactionEntrySchema = Schema.Struct({
  type: Schema.Literal("compaction"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  summary: Schema.String,
  firstKeptEntryId: Schema.String,
  tokensBefore: Schema.Number,
  details: Schema.optionalKey(Schema.Unknown),
  fromHook: Schema.optionalKey(Schema.Boolean),
});

const PiBranchSummaryEntrySchema = Schema.Struct({
  type: Schema.Literal("branch_summary"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  fromId: Schema.String,
  summary: Schema.String,
  details: Schema.optionalKey(Schema.Unknown),
  fromHook: Schema.optionalKey(Schema.Boolean),
});

const PiCustomEntrySchema = Schema.Struct({
  type: Schema.Literal("custom"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  customType: Schema.String,
  data: Schema.optionalKey(Schema.Unknown),
});

const PiCustomMessageEntrySchema = Schema.Struct({
  type: Schema.Literal("custom_message"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  customType: Schema.String,
  content: Schema.Unknown,
  details: Schema.optionalKey(Schema.Unknown),
  display: Schema.Boolean,
});

const PiLabelEntrySchema = Schema.Struct({
  type: Schema.Literal("label"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  targetId: Schema.String,
  label: Schema.optionalKey(Schema.String),
});

const PiSessionInfoEntrySchema = Schema.Struct({
  type: Schema.Literal("session_info"),
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  name: Schema.optionalKey(Schema.String),
});

export const PiSessionEntrySchema = Schema.Union([
  PiMessageEntrySchema,
  PiModelChangeEntrySchema,
  PiThinkingLevelChangeEntrySchema,
  PiCompactionEntrySchema,
  PiBranchSummaryEntrySchema,
  PiCustomEntrySchema,
  PiCustomMessageEntrySchema,
  PiLabelEntrySchema,
  PiSessionInfoEntrySchema,
]);

export const AgentHistorySchema = Schema.Struct({
  agentId: Schema.String,
  projectId: Schema.String,
  sessionFile: Schema.String,
  sessionId: Schema.String,
  cwd: Schema.String,
  sessionName: Schema.optionalKey(Schema.String),
  leafId: Schema.NullOr(Schema.String),
  entries: Schema.Array(PiSessionEntrySchema),
});

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
export type PromptMode = typeof PromptModeSchema.Type;
export type PromptAgentInput = typeof PromptAgentInputSchema.Type;
export type GetAgentRuntimeInput = typeof GetAgentRuntimeInputSchema.Type;
export type GetAgentHistoryInput = typeof GetAgentHistoryInputSchema.Type;
export type PiSessionInfo = typeof PiSessionInfoSchema.Type;
export type PiSessionInfoList = typeof PiSessionInfoListSchema.Type;
export type AgentRuntimeState = typeof AgentRuntimeStateSchema.Type;
export type PiSessionEntry = typeof PiSessionEntrySchema.Type;
export type AgentHistory = typeof AgentHistorySchema.Type;
export type AgentEvent = typeof AgentEventSchema.Type;
