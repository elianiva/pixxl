/**
 * Pi-derived Effect Schemas.
 *
 * Schemas prefixed with `Pi` are Effect versions of @mariozechner types,
 * used for oRPC contract validation.
 *
 * Import types directly from @mariozechner packages, not from here.
 */

import { Schema } from "effect";

/** Pi SessionInfo schema for contract validation */
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
  allMessagesText: Schema.String,
});

export type PiSessionInfoSchemaType = typeof PiSessionInfoSchema.Type;

/** Pi TextContent schema - exact match */
export const PiTextContentSchema = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  textSignature: Schema.optionalKey(Schema.String),
});

export type PiTextContentSchemaType = typeof PiTextContentSchema.Type;

/** Pi ImageContent schema - exact match */
export const PiImageContentSchema = Schema.Struct({
  type: Schema.Literal("image"),
  data: Schema.String,
  mimeType: Schema.String,
});

export type PiImageContentSchemaType = typeof PiImageContentSchema.Type;

// ============================================================
// Pi SessionEntry discriminated union schemas
// Based on @mariozechner/pi-coding-agent SessionEntry types
// ============================================================

/** Base fields for all session entries */
const SessionEntryBase = {
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
};

/**
 * Pi SessionMessageEntry schema.
 * message field uses Unknown because AgentMessage can be extended by apps.
 */
const PiSessionMessageEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("message"),
  // AgentMessage is extensible - use Unknown to preserve extension fields
  message: Schema.Unknown,
});

/** Pi ThinkingLevelChangeEntry schema - exact match */
const PiThinkingLevelChangeEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("thinking_level_change"),
  thinkingLevel: Schema.String,
});

/** Pi ModelChangeEntry schema - exact match */
const PiModelChangeEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("model_change"),
  provider: Schema.String,
  modelId: Schema.String,
});

/**
 * Pi CompactionEntry schema.
 * details field uses Unknown because extensions can add data.
 */
const PiCompactionEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("compaction"),
  summary: Schema.String,
  firstKeptEntryId: Schema.String,
  tokensBefore: Schema.Number,
  details: Schema.optionalKey(Schema.Unknown),
  fromHook: Schema.optionalKey(Schema.Boolean),
});

/**
 * Pi BranchSummaryEntry schema.
 * details field uses Unknown because extensions can add data.
 */
const PiBranchSummaryEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("branch_summary"),
  fromId: Schema.String,
  summary: Schema.String,
  details: Schema.optionalKey(Schema.Unknown),
  fromHook: Schema.optionalKey(Schema.Boolean),
});

/**
 * Pi CustomEntry schema.
 * data field uses Unknown for extension-specific data.
 */
const PiCustomEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("custom"),
  customType: Schema.String,
  data: Schema.optionalKey(Schema.Unknown),
});

/** Pi LabelEntry schema - exact match */
const PiLabelEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("label"),
  targetId: Schema.String,
  label: Schema.NullOr(Schema.String),
});

/** Pi SessionInfoEntry schema - exact match */
const PiSessionInfoEntrySchema = Schema.Struct({
  ...SessionEntryBase,
  type: Schema.Literal("session_info"),
  name: Schema.optionalKey(Schema.String),
});

/**
 * Full Pi SessionEntry discriminated union schema.
 * Represents all possible session entry types from pi-coding-agent.
 */
export const PiSessionEntrySchema = Schema.Union([
  PiSessionMessageEntrySchema,
  PiThinkingLevelChangeEntrySchema,
  PiModelChangeEntrySchema,
  PiCompactionEntrySchema,
  PiBranchSummaryEntrySchema,
  PiCustomEntrySchema,
  PiLabelEntrySchema,
  PiSessionInfoEntrySchema,
]);

export type PiSessionEntrySchemaType = typeof PiSessionEntrySchema.Type;

/** Pi ToolCall schema - exact match */
export const PiToolCallSchema = Schema.Struct({
  type: Schema.Literal("toolCall"),
  id: Schema.String,
  name: Schema.String,
  arguments: Schema.Record(Schema.String, Schema.Unknown),
});

export type PiToolCallSchemaType = typeof PiToolCallSchema.Type;

/** Pi Usage schema - exact match */
export const PiUsageSchema = Schema.Struct({
  input: Schema.Number,
  output: Schema.Number,
  cacheRead: Schema.Number,
  cacheWrite: Schema.Number,
  totalTokens: Schema.Number,
  cost: Schema.Struct({
    input: Schema.Number,
    output: Schema.Number,
    cacheRead: Schema.Number,
    cacheWrite: Schema.Number,
    total: Schema.Number,
  }),
});

export type PiUsageSchemaType = typeof PiUsageSchema.Type;

/** Pi StopReason schema - exact match */
export const PiStopReasonSchema = Schema.Literals([
  "stop",
  "length",
  "toolUse",
  "error",
  "aborted",
]);

export type PiStopReasonSchemaType = typeof PiStopReasonSchema.Type;
