import { Schema } from "effect";
import type { SessionEntry, SessionInfo } from "@mariozechner/pi-coding-agent";
import { PiSessionInfoSchema } from "./pi";

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

// Immediate prompt schema
export const AgentThinkingLevelSchema = Schema.Literals([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

export const AgentModelSchema = Schema.Struct({
  provider: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

export const PiAvailableModelSchema = Schema.Struct({
  provider: Schema.String,
  id: Schema.String,
  name: Schema.String,
  fullId: Schema.String,
});

export const AgentFrontendConfigSchema = Schema.Struct({
  availableModels: Schema.Array(PiAvailableModelSchema),
  defaultProvider: Schema.String,
  defaultModel: Schema.String,
  defaultThinkingLevel: AgentThinkingLevelSchema,
  enabledModels: Schema.Array(Schema.String),
});

export const PromptAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
});

export const ConfigureAgentSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  model: AgentModelSchema,
  thinkingLevel: AgentThinkingLevelSchema,
});

export const EnqueuePromptModeSchema = Schema.Literals(["steer", "followUp"]);

export const EnqueueAgentPromptInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
  mode: EnqueuePromptModeSchema,
});

export const GetAgentRuntimeInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const GetAgentHistoryInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const AbortAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

// Re-export Pi types (unprefixed - the actual types from Pi packages)
export type PiSessionInfo = SessionInfo;
export type PiSessionEntry = SessionEntry;

// List schemas using Pi schemas
export const PiSessionInfoListSchema = Schema.Array(PiSessionInfoSchema);

// Agent runtime state schema
export const AgentRuntimeStateSchema = Schema.Struct({
  agentId: Schema.String,
  projectId: Schema.String,
  status: Schema.Literals(["idle", "streaming", "initializing", "switchingSession", "error"]),
  queuedSteering: Schema.Array(Schema.String),
  queuedFollowUp: Schema.Array(Schema.String),
  currentSessionFile: Schema.String,
  model: Schema.optionalKey(AgentModelSchema),
  thinkingLevel: AgentThinkingLevelSchema,
});

export const AgentHistorySchema = Schema.Struct({
  agentId: Schema.String,
  projectId: Schema.String,
  sessionFile: Schema.String,
  sessionId: Schema.String,
  cwd: Schema.String,
  sessionName: Schema.optionalKey(Schema.String),
  leafId: Schema.NullOr(Schema.String),
  entries: Schema.Array(Schema.Unknown),
});

// Streaming event schemas for the web UI (local to our app, not from Pi)
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
export type AgentThinkingLevel = typeof AgentThinkingLevelSchema.Type;
export type AgentModel = typeof AgentModelSchema.Type;
export type PiAvailableModel = typeof PiAvailableModelSchema.Type;
export type AgentFrontendConfig = typeof AgentFrontendConfigSchema.Type;
export type PromptAgentInput = typeof PromptAgentInputSchema.Type;
export type ConfigureAgentSessionInput = typeof ConfigureAgentSessionInputSchema.Type;
export type EnqueuePromptMode = typeof EnqueuePromptModeSchema.Type;
export type EnqueueAgentPromptInput = typeof EnqueueAgentPromptInputSchema.Type;
export type GetAgentRuntimeInput = typeof GetAgentRuntimeInputSchema.Type;
export type GetAgentHistoryInput = typeof GetAgentHistoryInputSchema.Type;
export type AbortAgentInput = typeof AbortAgentInputSchema.Type;
export type PiSessionInfoList = typeof PiSessionInfoListSchema.Type;
export type AgentRuntimeState = typeof AgentRuntimeStateSchema.Type;
export type AgentHistory = typeof AgentHistorySchema.Type;
export type AgentEvent = typeof AgentEventSchema.Type;
