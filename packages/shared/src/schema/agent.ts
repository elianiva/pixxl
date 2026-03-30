import { Schema } from "effect";
import type { SessionEntry, SessionInfo } from "@mariozechner/pi-coding-agent";
import { PiSessionEntrySchema, PiSessionInfoSchema, PiUsageSchema } from "./pi";

export const CreateAgentInputSchema = Schema.Struct({
  id: Schema.String,
  projectId: Schema.String,
  name: Schema.NonEmptyString,
  sessionFile: Schema.optionalKey(Schema.String),
});

export const UpdateAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
  name: Schema.String,
  sessionFile: Schema.optionalKey(Schema.String),
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
  projectId: Schema.String,
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

export const AgentCostSchema = Schema.Struct({
  input: Schema.Number,
  output: Schema.Number,
  cacheRead: Schema.Number,
  cacheWrite: Schema.Number,
});

export const AgentModelSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  api: Schema.String,
  provider: Schema.String,
  baseUrl: Schema.String,
  reasoning: Schema.Boolean,
  input: Schema.Array(Schema.Literals(["text", "image"])),
  cost: AgentCostSchema,
  contextWindow: Schema.Number,
  maxTokens: Schema.Number,
  headers: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

export const PiAvailableModelSchema = Schema.Struct({
  provider: Schema.String,
  id: Schema.String,
  name: Schema.String,
  fullId: Schema.String,
});

export const PiAvailableModelListSchema = Schema.Array(PiAvailableModelSchema);

export const AgentFrontendConfigSchema = Schema.Struct({
  defaultProvider: Schema.String,
  defaultModel: Schema.String,
  defaultThinkingLevel: AgentThinkingLevelSchema,
  transport: Schema.Literals(["sse", "websocket", "auto"]),
  steeringMode: Schema.Literals(["all", "one-at-a-time"]),
  followUpMode: Schema.Literals(["all", "one-at-a-time"]),
  theme: Schema.optional(Schema.String),
  hideThinkingBlock: Schema.Boolean,
  shellPath: Schema.optional(Schema.String),
  shellCommandPrefix: Schema.optional(Schema.String),
  enableSkillCommands: Schema.Boolean,
  doubleEscapeAction: Schema.Literals(["fork", "tree", "none"]),
  treeFilterMode: Schema.Literals(["default", "no-tools", "user-only", "labeled-only", "all"]),
  enabledModels: Schema.optional(Schema.Array(Schema.String)),
  sessionDir: Schema.optional(Schema.String),
});

export const PromptAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
  userOptimisticId: Schema.optional(Schema.String),
  assistantOptimisticId: Schema.optional(Schema.String),
});

export const AgentModelRefSchema = Schema.Struct({
  provider: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

export const ConfigureAgentSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  model: AgentModelRefSchema,
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

export const GetAgentUsageInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const AgentUsageSchema = Schema.Struct({
  usage: Schema.optionalKey(PiUsageSchema),
  contextWindow: Schema.optionalKey(Schema.Number),
});

// Agent session details schema
export const GetAgentSessionDetailsInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const AgentSessionStatsSchema = Schema.Struct({
  totalTokens: Schema.Number,
  messageCount: Schema.Number,
  toolCallCount: Schema.Number,
  totalCost: Schema.Number,
});

export const SessionTreeNodeSchema = Schema.Struct({
  id: Schema.String,
  parentId: Schema.optional(Schema.String),
  role: Schema.String,
  type: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
  hasChildren: Schema.Boolean,
  isLeaf: Schema.Boolean,
});

export const AgentSessionDetailsSchema = Schema.Struct({
  sessionFile: Schema.String,
  sessionId: Schema.String,
  sessionName: Schema.optional(Schema.String),
  cwd: Schema.String,
  leafId: Schema.String,
  createdAt: Schema.optional(Schema.String),
  updatedAt: Schema.optional(Schema.String),
  stats: AgentSessionStatsSchema,
  tree: Schema.Array(SessionTreeNodeSchema),
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
  usage: Schema.optionalKey(PiUsageSchema),
  contextWindow: Schema.optionalKey(Schema.Number),
});

export const AgentHistorySchema = Schema.Struct({
  agentId: Schema.String,
  projectId: Schema.String,
  sessionFile: Schema.String,
  sessionId: Schema.String,
  cwd: Schema.String,
  sessionName: Schema.optional(Schema.String),
  leafId: Schema.NullOr(Schema.String),
  entries: Schema.Array(PiSessionEntrySchema),
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

const MessageFinalizedEventSchema = Schema.Struct({
  type: Schema.Literal("message_finalized"),
  sessionId: Schema.String,
  optimisticId: Schema.String,
  persistedId: Schema.String,
  role: Schema.Literals(["user", "assistant"]),
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
  MessageFinalizedEventSchema,
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
export type AgentModelRef = typeof AgentModelRefSchema.Type;
export type PiAvailableModel = typeof PiAvailableModelSchema.Type;
export type PiAvailableModelList = typeof PiAvailableModelListSchema.Type;
export type AgentFrontendConfig = typeof AgentFrontendConfigSchema.Type;
export type PromptAgentInput = typeof PromptAgentInputSchema.Type;
export type ConfigureAgentSessionInput = typeof ConfigureAgentSessionInputSchema.Type;
export type EnqueuePromptMode = typeof EnqueuePromptModeSchema.Type;
export type EnqueueAgentPromptInput = typeof EnqueueAgentPromptInputSchema.Type;
export type GetAgentRuntimeInput = typeof GetAgentRuntimeInputSchema.Type;
export type GetAgentHistoryInput = typeof GetAgentHistoryInputSchema.Type;
export type AbortAgentInput = typeof AbortAgentInputSchema.Type;
export type GetAgentUsageInput = typeof GetAgentUsageInputSchema.Type;
export type AgentUsage = typeof AgentUsageSchema.Type;
export type PiSessionInfoList = typeof PiSessionInfoListSchema.Type;
export type AgentRuntimeState = typeof AgentRuntimeStateSchema.Type;
export type AgentHistory = typeof AgentHistorySchema.Type;
export type AgentEvent = typeof AgentEventSchema.Type;
export type GetAgentSessionDetailsInput = typeof GetAgentSessionDetailsInputSchema.Type;
export type AgentSessionStats = typeof AgentSessionStatsSchema.Type;
export type SessionTreeNode = typeof SessionTreeNodeSchema.Type;
export type AgentSessionDetails = typeof AgentSessionDetailsSchema.Type;
