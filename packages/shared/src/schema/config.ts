import { Schema } from "effect";

// ============================================================================
// Base Types
// ============================================================================

export const CursorStyle = Schema.Literals(["block", "underline", "bar"]);
export const ColorScheme = Schema.Literals(["dark", "light", "system"]);

// pi Transport type
export const Transport = Schema.Literals(["sse", "websocket", "auto"]);

// pi Thinking level type
export const ThinkingLevel = Schema.Literals(["off", "minimal", "low", "medium", "high", "xhigh"]);

// pi Steering/Follow-up mode
export const SteeringMode = Schema.Literals(["all", "one-at-a-time"]);
export const FollowUpMode = Schema.Literals(["all", "one-at-a-time"]);

// ============================================================================
// Workspace (pixxl-specific)
// ============================================================================

export const WorkspaceSchema = Schema.Struct({
  directory: Schema.String,
  autoSave: Schema.Boolean,
});

// ============================================================================
// Terminal (UI appearance - not pi's terminal settings)
// ============================================================================

export const TerminalSchema = Schema.Struct({
  fontSize: Schema.Number,
  fontFamily: Schema.String,
  cursorStyle: CursorStyle,
  cursorBlink: Schema.Boolean,
  shell: Schema.String,
});

// ============================================================================
// Agent Settings (aligned with pi)
// ============================================================================

export const CompactionSettingsSchema = Schema.Struct({
  enabled: Schema.optionalKey(Schema.Boolean),
  reserveTokens: Schema.optionalKey(Schema.Number),
  keepRecentTokens: Schema.optionalKey(Schema.Number),
});

export const RetrySettingsSchema = Schema.Struct({
  enabled: Schema.optionalKey(Schema.Boolean),
  maxRetries: Schema.optionalKey(Schema.Number),
  baseDelayMs: Schema.optionalKey(Schema.Number),
  maxDelayMs: Schema.optionalKey(Schema.Number),
});

export const ThinkingBudgetsSchema = Schema.Struct({
  minimal: Schema.optionalKey(Schema.Number),
  low: Schema.optionalKey(Schema.Number),
  medium: Schema.optionalKey(Schema.Number),
  high: Schema.optionalKey(Schema.Number),
});

export const ImageSettingsSchema = Schema.Struct({
  autoResize: Schema.optionalKey(Schema.Boolean),
  blockImages: Schema.optionalKey(Schema.Boolean),
});

export const TerminalSettingsSchema = Schema.Struct({
  showImages: Schema.optionalKey(Schema.Boolean),
  clearOnShrink: Schema.optionalKey(Schema.Boolean),
});

export const MarkdownSettingsSchema = Schema.Struct({
  codeBlockIndent: Schema.optionalKey(Schema.String),
});

/**
 * Package source for npm/git packages.
 * We use a simpler string array for now - the package source format
 * can be validated at runtime if needed.
 */
export const PackageSourceSchema = Schema.String;
export type PackageSource = typeof PackageSourceSchema.Type;

/**
 * Agent configuration aligned with pi settings.
 * See: ~/Repositories/pi-mono/packages/coding-agent/src/core/settings-manager.ts
 */
export const AgentSchema = Schema.Struct({
  // Default model provider (e.g., "anthropic")
  defaultProvider: Schema.optionalKey(Schema.String),
  // Default model ID (e.g., "claude-sonnet-4-20250514")
  defaultModel: Schema.optionalKey(Schema.String),
  // Thinking level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"
  defaultThinkingLevel: Schema.optionalKey(ThinkingLevel),
  // Transport: "sse" | "websocket" | "auto"
  transport: Schema.optionalKey(Transport),
  // Steering mode: how to handle multiple queued messages
  steeringMode: Schema.optionalKey(SteeringMode),
  // Follow-up mode: how to handle follow-up messages
  followUpMode: Schema.optionalKey(FollowUpMode),
  // Compaction settings
  compaction: Schema.optionalKey(CompactionSettingsSchema),
  // Retry settings for rate limits/overloads
  retry: Schema.optionalKey(RetrySettingsSchema),
  // Hide thinking block in output
  hideThinkingBlock: Schema.optionalKey(Schema.Boolean),
  // Custom shell path (e.g., for Cygwin users)
  shellPath: Schema.optionalKey(Schema.String),
  // Prefix prepended to every bash command
  shellCommandPrefix: Schema.optionalKey(Schema.String),
  // NPM/git package sources
  packages: Schema.optionalKey(Schema.Array(PackageSourceSchema)),
  // Local extension paths
  extensions: Schema.optionalKey(Schema.Array(Schema.String)),
  // Local skill paths
  skills: Schema.optionalKey(Schema.Array(Schema.String)),
  // Local prompt template paths
  prompts: Schema.optionalKey(Schema.Array(Schema.String)),
  // Local theme paths
  themes: Schema.optionalKey(Schema.Array(Schema.String)),
  // Enable /skill:name commands (default: true)
  enableSkillCommands: Schema.optionalKey(Schema.Boolean),
  // Custom token budgets for thinking levels
  thinkingBudgets: Schema.optionalKey(ThinkingBudgetsSchema),
  // Terminal display settings
  terminal: Schema.optionalKey(TerminalSettingsSchema),
  // Image processing settings
  images: Schema.optionalKey(ImageSettingsSchema),
  // Markdown rendering settings
  markdown: Schema.optionalKey(MarkdownSettingsSchema),
  // Enabled model patterns for cycling
  enabledModels: Schema.optionalKey(Schema.Array(Schema.String)),
  // Action for double-escape with empty editor
  doubleEscapeAction: Schema.optionalKey(Schema.Literals(["fork", "tree", "none"])),
  // Tree filter mode
  treeFilterMode: Schema.optionalKey(
    Schema.Literals(["default", "no-tools", "user-only", "labeled-only", "all"]),
  ),
});

// ============================================================================
// Appearance (UI settings)
// ============================================================================

export const AppearanceSchema = Schema.Struct({
  colorScheme: ColorScheme,
  compactMode: Schema.Boolean,
  showLineNumbers: Schema.Boolean,
});

// ============================================================================
// Full App Config
// ============================================================================

export const AppConfigSchema = Schema.Struct({
  workspace: WorkspaceSchema,
  terminal: TerminalSchema,
  agent: AgentSchema,
  appearance: AppearanceSchema,
});

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_CONFIG: AppConfig = {
  workspace: {
    directory: "",
    autoSave: true,
  },
  terminal: {
    fontSize: 14,
    fontFamily: "JetBrains Mono",
    cursorStyle: "block",
    cursorBlink: true,
    shell: "/bin/zsh",
  },
  agent: {
    // pi defaults
    transport: "websocket",
    defaultThinkingLevel: "medium",
    steeringMode: "one-at-a-time",
    followUpMode: "one-at-a-time",
    // pi compaction defaults
    compaction: {
      enabled: true,
      reserveTokens: 16384,
      keepRecentTokens: 20000,
    },
    // pi retry defaults
    retry: {
      enabled: true,
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 60000,
    },
    // Disable thinking block by default for cleaner output
    hideThinkingBlock: false,
    // Enable skill commands by default
    enableSkillCommands: true,
    // Terminal defaults
    terminal: {
      showImages: true,
      clearOnShrink: false,
    },
    // Image defaults
    images: {
      autoResize: true,
      blockImages: false,
    },
    // Markdown defaults
    markdown: {
      codeBlockIndent: "  ",
    },
  },
  appearance: {
    colorScheme: "dark",
    compactMode: false,
    showLineNumbers: true,
  },
};
