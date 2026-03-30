import { Schema } from "effect";
import type { SessionInfo } from "@mariozechner/pi-coding-agent";
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

export const CreateSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const ListAttachableSessionsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

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

export const AgentModelRefSchema = Schema.Struct({
  provider: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

export const PromptAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
});

export const EnqueuePromptModeSchema = Schema.Literals(["steer", "followUp"]);

export const EnqueueAgentPromptInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  text: Schema.String,
  mode: EnqueuePromptModeSchema,
});

export const ConfigureAgentSessionInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  model: AgentModelRefSchema,
  thinkingLevel: AgentThinkingLevelSchema,
});

export const SetAgentModelInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  model: AgentModelRefSchema,
});

export const SetAgentThinkingLevelInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
  thinkingLevel: AgentThinkingLevelSchema,
});

export const AbortAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const GetAgentRuntimeInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const GetAgentHistoryInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const GetAgentUsageInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const GetAgentSessionDetailsInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const SubscribeAgentInputSchema = Schema.Struct({
  projectId: Schema.String,
  agentId: Schema.String,
});

export const PiAgentStartEventSchema = Schema.Struct({
  type: Schema.Literal("agent_start"),
});

export const PiAgentEndEventSchema = Schema.Struct({
  type: Schema.Literal("agent_end"),
  messages: Schema.Array(Schema.Unknown),
});

export const PiTurnStartEventSchema = Schema.Struct({
  type: Schema.Literal("turn_start"),
});

export const PiTurnEndEventSchema = Schema.Struct({
  type: Schema.Literal("turn_end"),
  message: Schema.Unknown,
  toolResults: Schema.Array(Schema.Unknown),
});

export const PiMessageStartEventSchema = Schema.Struct({
  type: Schema.Literal("message_start"),
  message: Schema.Unknown,
});

export const PiMessageUpdateEventSchema = Schema.Struct({
  type: Schema.Literal("message_update"),
  message: Schema.Unknown,
  assistantMessageEvent: Schema.Unknown,
});

export const PiMessageEndEventSchema = Schema.Struct({
  type: Schema.Literal("message_end"),
  message: Schema.Unknown,
});

export const PiToolExecutionStartEventSchema = Schema.Struct({
  type: Schema.Literal("tool_execution_start"),
  toolCallId: Schema.String,
  toolName: Schema.String,
  args: Schema.Unknown,
});

export const PiToolExecutionUpdateEventSchema = Schema.Struct({
  type: Schema.Literal("tool_execution_update"),
  toolCallId: Schema.String,
  toolName: Schema.String,
  args: Schema.Unknown,
  partialResult: Schema.Unknown,
});

export const PiToolExecutionEndEventSchema = Schema.Struct({
  type: Schema.Literal("tool_execution_end"),
  toolCallId: Schema.String,
  toolName: Schema.String,
  result: Schema.Unknown,
  isError: Schema.Boolean,
});

export const PiQueueUpdateEventSchema = Schema.Struct({
  type: Schema.Literal("queue_update"),
  steering: Schema.Array(Schema.String),
  followUp: Schema.Array(Schema.String),
});

export const PiCompactionStartEventSchema = Schema.Struct({
  type: Schema.Literal("compaction_start"),
  reason: Schema.Literals(["manual", "threshold", "overflow"]),
});

export const PiCompactionEndEventSchema = Schema.Struct({
  type: Schema.Literal("compaction_end"),
  reason: Schema.Literals(["manual", "threshold", "overflow"]),
  aborted: Schema.Boolean,
  willRetry: Schema.Boolean,
});

export const PiAutoRetryStartEventSchema = Schema.Struct({
  type: Schema.Literal("auto_retry_start"),
  attempt: Schema.Number,
  maxAttempts: Schema.Number,
  delayMs: Schema.Number,
  errorMessage: Schema.String,
});

export const PiAutoRetryEndEventSchema = Schema.Struct({
  type: Schema.Literal("auto_retry_end"),
  success: Schema.Boolean,
  attempt: Schema.Number,
});

export const PiAgentEventSchema = Schema.Union([
  PiAgentStartEventSchema,
  PiAgentEndEventSchema,
  PiTurnStartEventSchema,
  PiTurnEndEventSchema,
  PiMessageStartEventSchema,
  PiMessageUpdateEventSchema,
  PiMessageEndEventSchema,
  PiToolExecutionStartEventSchema,
  PiToolExecutionUpdateEventSchema,
  PiToolExecutionEndEventSchema,
  PiQueueUpdateEventSchema,
  PiCompactionStartEventSchema,
  PiCompactionEndEventSchema,
  PiAutoRetryStartEventSchema,
  PiAutoRetryEndEventSchema,
]);

export const AgentSnapshotSchema = Schema.Struct({
  type: Schema.Literal("snapshot"),
  entries: Schema.Array(PiSessionEntrySchema),
  status: Schema.Literals(["idle", "streaming", "error"]),
  queuedSteering: Schema.Array(Schema.String),
  queuedFollowUp: Schema.Array(Schema.String),
});

export const AgentStreamItemSchema = Schema.Union([AgentSnapshotSchema, PiAgentEventSchema]);

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

export const AgentUsageSchema = Schema.Struct({
  usage: Schema.optionalKey(PiUsageSchema),
  contextWindow: Schema.optionalKey(Schema.Number),
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

export type PiSessionInfo = SessionInfo;
export type PiSessionEntry = typeof PiSessionEntrySchema.Type;

export const PiSessionInfoListSchema = Schema.Array(PiSessionInfoSchema);

export type CreateAgentInput = typeof CreateAgentInputSchema.Type;
export type GetAgentInput = typeof GetAgentInputSchema.Type;
export type UpdateAgentInput = typeof UpdateAgentInputSchema.Type;
export type DeleteAgentInput = typeof DeleteAgentInputSchema.Type;
export type AgentMetadata = typeof AgentMetadataSchema.Type;
export type AgentMetadataList = typeof AgentMetadataListSchema.Type;
export type ListAgentsInput = typeof ListAgentsInputSchema.Type;
export type AttachSessionInput = typeof AttachSessionInputSchema.Type;
export type SwitchSessionInput = typeof SwitchSessionInputSchema.Type;
export type CreateSessionInput = typeof CreateSessionInputSchema.Type;
export type ListAttachableSessionsInput = typeof ListAttachableSessionsInputSchema.Type;
export type AgentThinkingLevel = typeof AgentThinkingLevelSchema.Type;
export type AgentModel = typeof AgentModelSchema.Type;
export type AgentModelRef = typeof AgentModelRefSchema.Type;
export type PiAvailableModel = typeof PiAvailableModelSchema.Type;
export type PiAvailableModelList = typeof PiAvailableModelListSchema.Type;
export type AgentFrontendConfig = typeof AgentFrontendConfigSchema.Type;
export type PromptAgentInput = typeof PromptAgentInputSchema.Type;
export type EnqueueAgentPromptInput = typeof EnqueueAgentPromptInputSchema.Type;
export type ConfigureAgentSessionInput = typeof ConfigureAgentSessionInputSchema.Type;
export type SetAgentModelInput = typeof SetAgentModelInputSchema.Type;
export type SetAgentThinkingLevelInput = typeof SetAgentThinkingLevelInputSchema.Type;
export type EnqueuePromptMode = typeof EnqueuePromptModeSchema.Type;
export type GetAgentRuntimeInput = typeof GetAgentRuntimeInputSchema.Type;
export type GetAgentHistoryInput = typeof GetAgentHistoryInputSchema.Type;
export type AbortAgentInput = typeof AbortAgentInputSchema.Type;
export type AgentUsage = typeof AgentUsageSchema.Type;
export type PiSessionInfoList = typeof PiSessionInfoListSchema.Type;
export type AgentRuntimeState = typeof AgentRuntimeStateSchema.Type;
export type AgentHistory = typeof AgentHistorySchema.Type;
export type GetAgentSessionDetailsInput = typeof GetAgentSessionDetailsInputSchema.Type;
export type AgentSessionStats = typeof AgentSessionStatsSchema.Type;
export type SessionTreeNode = typeof SessionTreeNodeSchema.Type;
export type AgentSessionDetails = typeof AgentSessionDetailsSchema.Type;
export type SubscribeAgentInput = typeof SubscribeAgentInputSchema.Type;
export type AgentSnapshot = typeof AgentSnapshotSchema.Type;
export type AgentStreamItem = typeof AgentStreamItemSchema.Type;

export type PiAgentStartEvent = typeof PiAgentStartEventSchema.Type;
export type PiAgentEndEvent = typeof PiAgentEndEventSchema.Type;
export type PiTurnStartEvent = typeof PiTurnStartEventSchema.Type;
export type PiTurnEndEvent = typeof PiTurnEndEventSchema.Type;
export type PiMessageStartEvent = typeof PiMessageStartEventSchema.Type;
export type PiMessageUpdateEvent = typeof PiMessageUpdateEventSchema.Type;
export type PiMessageEndEvent = typeof PiMessageEndEventSchema.Type;
export type PiToolExecutionStartEvent = typeof PiToolExecutionStartEventSchema.Type;
export type PiToolExecutionUpdateEvent = typeof PiToolExecutionUpdateEventSchema.Type;
export type PiToolExecutionEndEvent = typeof PiToolExecutionEndEventSchema.Type;
export type PiQueueUpdateEvent = typeof PiQueueUpdateEventSchema.Type;
export type PiCompactionStartEvent = typeof PiCompactionStartEventSchema.Type;
export type PiCompactionEndEvent = typeof PiCompactionEndEventSchema.Type;
export type PiAutoRetryStartEvent = typeof PiAutoRetryStartEventSchema.Type;
export type PiAutoRetryEndEvent = typeof PiAutoRetryEndEventSchema.Type;
export type PiAgentEvent = typeof PiAgentEventSchema.Type;
