import { Schema, Struct } from "effect";

export const CursorStyle = Schema.Literals(["block", "underline", "bar"]);
export const ColorScheme = Schema.Literals(["dark", "light", "system"]);
export const Transport = Schema.Literals(["sse", "websocket", "auto"]);
export const ThinkingLevel = Schema.Literals(["off", "minimal", "low", "medium", "high", "xhigh"]);
export const SteeringMode = Schema.Literals(["all", "one-at-a-time"]);
export const FollowUpMode = Schema.Literals(["all", "one-at-a-time"]);

export const WorkspaceSchema = Schema.Struct({
  directory: Schema.String,
  autoSave: Schema.Boolean,
});

export const TerminalSchema = Schema.Struct({
  fontSize: Schema.Number,
  fontFamily: Schema.String,
  themeId: Schema.String,
  fontId: Schema.String,
  cursorStyle: CursorStyle,
  cursorBlink: Schema.Boolean,
  shell: Schema.String,
});

export const CompactionSettingsSchema = Schema.Struct({
  enabled: Schema.Boolean,
  reserveTokens: Schema.Number,
  keepRecentTokens: Schema.Number,
});

export const RetrySettingsSchema = Schema.Struct({
  enabled: Schema.Boolean,
  maxRetries: Schema.Number,
  baseDelayMs: Schema.Number,
  maxDelayMs: Schema.Number,
});

export const ThinkingBudgetsSchema = Schema.Struct({
  minimal: Schema.Number,
  low: Schema.Number,
  medium: Schema.Number,
  high: Schema.Number,
});

export const ImageSettingsSchema = Schema.Struct({
  autoResize: Schema.Boolean,
  blockImages: Schema.Boolean,
});

export const TerminalSettingsSchema = Schema.Struct({
  showImages: Schema.Boolean,
  clearOnShrink: Schema.Boolean,
});

export const MarkdownSettingsSchema = Schema.Struct({
  codeBlockIndent: Schema.String,
});

export const PackageSourceSchema = Schema.String;
export type PackageSource = typeof PackageSourceSchema.Type;

export const AgentSchema = Schema.Struct({
  defaultProvider: Schema.String,
  defaultModel: Schema.String,
  defaultThinkingLevel: ThinkingLevel,
  transport: Transport,
  steeringMode: SteeringMode,
  followUpMode: FollowUpMode,
  compaction: CompactionSettingsSchema,
  retry: RetrySettingsSchema,
  hideThinkingBlock: Schema.Boolean,
  shellPath: Schema.String,
  shellCommandPrefix: Schema.String,
  packages: Schema.Array(PackageSourceSchema),
  extensions: Schema.Array(Schema.String),
  skills: Schema.Array(Schema.String),
  prompts: Schema.Array(Schema.String),
  themes: Schema.Array(Schema.String),
  enableSkillCommands: Schema.Boolean,
  thinkingBudgets: ThinkingBudgetsSchema,
  terminal: TerminalSettingsSchema,
  images: ImageSettingsSchema,
  markdown: MarkdownSettingsSchema,
  doubleEscapeAction: Schema.Literals(["fork", "tree", "none"]),
  treeFilterMode: Schema.Literals(["default", "no-tools", "user-only", "labeled-only", "all"]),
});

export const AppearanceSchema = Schema.Struct({
  colorScheme: ColorScheme,
  compactMode: Schema.Boolean,
  showLineNumbers: Schema.Boolean,
});

export const AppConfigSchema = Schema.Struct({
  workspace: WorkspaceSchema,
  terminal: TerminalSchema,
  agent: AgentSchema,
  appearance: AppearanceSchema,
});

export const PartialCompactionSettingsSchema = CompactionSettingsSchema.mapFields(
  Struct.map(Schema.optionalKey),
);

export const PartialRetrySettingsSchema = RetrySettingsSchema.mapFields(
  Struct.map(Schema.optionalKey),
);

export const PartialThinkingBudgetsSchema = ThinkingBudgetsSchema.mapFields(
  Struct.map(Schema.optionalKey),
);

export const PartialImageSettingsSchema = ImageSettingsSchema.mapFields(
  Struct.map(Schema.optionalKey),
);

export const PartialTerminalSettingsSchema = TerminalSettingsSchema.mapFields(
  Struct.map(Schema.optionalKey),
);

export const PartialMarkdownSettingsSchema = MarkdownSettingsSchema.mapFields(
  Struct.map(Schema.optionalKey),
);

export const PartialAgentSchema = AgentSchema.mapFields(Struct.map(Schema.optionalKey));

export const PartialWorkspaceSchema = WorkspaceSchema.mapFields(Struct.map(Schema.optionalKey));

export const PartialTerminalSchema = TerminalSchema.mapFields(Struct.map(Schema.optionalKey));

export const PartialAppearanceSchema = AppearanceSchema.mapFields(Struct.map(Schema.optionalKey));

export const PartialAppConfigSchema = Schema.Struct({
  workspace: Schema.optionalKey(PartialWorkspaceSchema),
  terminal: Schema.optionalKey(PartialTerminalSchema),
  agent: Schema.optionalKey(PartialAgentSchema),
  appearance: Schema.optionalKey(PartialAppearanceSchema),
});

export type AppConfig = typeof AppConfigSchema.Type;
export type Workspace = typeof WorkspaceSchema.Type;
export type Terminal = typeof TerminalSchema.Type;
export type Agent = typeof AgentSchema.Type;
export type Appearance = typeof AppearanceSchema.Type;
export type CompactionSettings = typeof CompactionSettingsSchema.Type;
export type RetrySettings = typeof RetrySettingsSchema.Type;
export type ThinkingBudgets = typeof ThinkingBudgetsSchema.Type;
export type ImageSettings = typeof ImageSettingsSchema.Type;
export type TerminalSettings = typeof TerminalSettingsSchema.Type;
export type MarkdownSettings = typeof MarkdownSettingsSchema.Type;

export const DEFAULT_CONFIG: AppConfig = {
  workspace: {
    directory: "",
    autoSave: true,
  },
  terminal: {
    fontSize: 14,
    fontFamily: "JetBrains Mono",
    themeId: "catppuccin-mocha",
    fontId: "jetbrains-mono",
    cursorStyle: "block",
    cursorBlink: true,
    shell: "/bin/zsh",
  },
  agent: {
    defaultProvider: "openrouter",
    defaultModel: "kimi-k2.5",
    defaultThinkingLevel: "medium",
    transport: "websocket",
    steeringMode: "one-at-a-time",
    followUpMode: "one-at-a-time",
    compaction: {
      enabled: true,
      reserveTokens: 16384,
      keepRecentTokens: 20000,
    },
    retry: {
      enabled: true,
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 60000,
    },
    hideThinkingBlock: false,
    shellPath: "",
    shellCommandPrefix: "",
    packages: [],
    extensions: [],
    skills: [],
    prompts: [],
    themes: [],
    enableSkillCommands: true,
    thinkingBudgets: {
      minimal: 0,
      low: 0,
      medium: 0,
      high: 0,
    },
    terminal: {
      showImages: true,
      clearOnShrink: false,
    },
    images: {
      autoResize: true,
      blockImages: false,
    },
    markdown: {
      codeBlockIndent: "  ",
    },
    doubleEscapeAction: "none",
    treeFilterMode: "default",
  },
  appearance: {
    colorScheme: "dark",
    compactMode: false,
    showLineNumbers: true,
  },
};
