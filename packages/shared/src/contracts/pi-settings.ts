import { Schema, Struct } from "effect";
import { oc } from "@orpc/contract";

// Schema matching pi's Settings interface
// First define required field schemas
export const PiCompactionSettingsSchema = Schema.Struct({
  enabled: Schema.Boolean,
  reserveTokens: Schema.Number,
  keepRecentTokens: Schema.Number,
});

export const PiRetrySettingsSchema = Schema.Struct({
  enabled: Schema.Boolean,
  maxRetries: Schema.Number,
  baseDelayMs: Schema.Number,
  maxDelayMs: Schema.Number,
});

export const PiTerminalSettingsSchema = Schema.Struct({
  showImages: Schema.Boolean,
  clearOnShrink: Schema.Boolean,
});

export const PiImageSettingsSchema = Schema.Struct({
  autoResize: Schema.Boolean,
  blockImages: Schema.Boolean,
});

export const PiThinkingBudgetsSchema = Schema.Struct({
  minimal: Schema.Number,
  low: Schema.Number,
  medium: Schema.Number,
  high: Schema.Number,
});

export const PiMarkdownSettingsSchema = Schema.Struct({
  codeBlockIndent: Schema.String,
});

export const PiPackageSourceSchema = Schema.Union([
  Schema.String,
  Schema.Struct({
    source: Schema.String,
    extensions: Schema.Array(Schema.String),
    skills: Schema.Array(Schema.String),
    prompts: Schema.Array(Schema.String),
    themes: Schema.Array(Schema.String),
  }),
]);

// Base PiSettings schema with required fields
const PiSettingsBaseSchema = Schema.Struct({
  defaultProvider: Schema.String,
  defaultModel: Schema.String,
  defaultThinkingLevel: Schema.Literals(["off", "minimal", "low", "medium", "high", "xhigh"]),
  transport: Schema.Literals(["sse", "websocket", "auto"]),
  steeringMode: Schema.Literals(["all", "one-at-a-time"]),
  followUpMode: Schema.Literals(["all", "one-at-a-time"]),
  theme: Schema.String,
  compaction: PiCompactionSettingsSchema,
  retry: PiRetrySettingsSchema,
  hideThinkingBlock: Schema.Boolean,
  shellPath: Schema.String,
  shellCommandPrefix: Schema.String,
  enableSkillCommands: Schema.Boolean,
  terminal: PiTerminalSettingsSchema,
  images: PiImageSettingsSchema,
  markdown: PiMarkdownSettingsSchema,
  skills: Schema.Array(Schema.String),
  prompts: Schema.Array(Schema.String),
  themes: Schema.Array(Schema.String),
  doubleEscapeAction: Schema.Literals(["fork", "tree", "none"]),
  treeFilterMode: Schema.Literals(["default", "no-tools", "user-only", "labeled-only", "all"]),
  thinkingBudgets: PiThinkingBudgetsSchema,
  packages: Schema.Array(PiPackageSourceSchema),
  extensions: Schema.Array(Schema.String),
  enabledModels: Schema.Array(Schema.String),
  sessionDir: Schema.String,
});

// Make all fields optional
export const PiSettingsSchema = PiSettingsBaseSchema.mapFields(Struct.map(Schema.optionalKey));

export type PiSettings = typeof PiSettingsSchema.Type;
export type PiPartialSettings = Partial<PiSettings>;

export const getPiSettingsContract = oc
  .input(Schema.toStandardSchemaV1(Schema.Void))
  .output(Schema.toStandardSchemaV1(PiSettingsSchema));

export const updatePiSettingsContract = oc
  .input(Schema.toStandardSchemaV1(PiSettingsSchema))
  .output(Schema.toStandardSchemaV1(PiSettingsSchema));
