import { Schema } from "effect";

export const CursorStyle = Schema.Literals(["block", "underline", "bar"]);
export const ColorScheme = Schema.Literals(["dark", "light", "system"]);

export const WorkspaceSchema = Schema.Struct({
  directory: Schema.String,
  autoSave: Schema.Boolean,
});

export const TerminalSchema = Schema.Struct({
  fontSize: Schema.Number,
  fontFamily: Schema.String,
  cursorStyle: CursorStyle,
  cursorBlink: Schema.Boolean,
  shell: Schema.String,
});

export const AgentSchema = Schema.Struct({
  name: Schema.String,
  provider: Schema.String,
  model: Schema.String,
  maxTokens: Schema.Number,
  temperature: Schema.Number,
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

export type AppConfig = typeof AppConfigSchema.Type;
export type Workspace = typeof WorkspaceSchema.Type;
export type Terminal = typeof TerminalSchema.Type;
export type Agent = typeof AgentSchema.Type;
export type Appearance = typeof AppearanceSchema.Type;

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
    name: "pi",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 8192,
    temperature: 0.7,
  },
  appearance: {
    colorScheme: "dark",
    compactMode: false,
    showLineNumbers: true,
  },
};
