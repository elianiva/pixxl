import { Schema } from "effect";

/**
 * Tool schemas for builtin tools.
 * Discriminated unions using proper Effect-TS patterns.
 */

// Read tool
export const ReadToolSchema = Schema.Struct({
  type: Schema.Literal("toolCall"),
  name: Schema.Literal("read"),
  id: Schema.String,
  arguments: Schema.Struct({
    path: Schema.String,
    offset: Schema.optional(Schema.Number),
    limit: Schema.optional(Schema.Number),
  }),
});

export type ReadTool = typeof ReadToolSchema.Type;

// Write tool
export const WriteToolSchema = Schema.Struct({
  type: Schema.Literal("toolCall"),
  name: Schema.Literal("write"),
  id: Schema.String,
  arguments: Schema.Struct({
    file: Schema.String,
    content: Schema.String,
  }),
});

export type WriteTool = typeof WriteToolSchema.Type;

// Edit tool
export const EditToolSchema = Schema.Struct({
  type: Schema.Literal("toolCall"),
  name: Schema.Literal("edit"),
  id: Schema.String,
  arguments: Schema.Struct({
    target: Schema.String,
    edits: Schema.Array(
      Schema.Struct({
        oldText: Schema.String,
        newText: Schema.String,
      }),
    ),
  }),
});

export type EditTool = typeof EditToolSchema.Type;

// Bash tool
export const BashToolSchema = Schema.Struct({
  type: Schema.Literal("toolCall"),
  name: Schema.Literal("bash"),
  id: Schema.String,
  arguments: Schema.Struct({
    command: Schema.optional(Schema.String),
    cmd: Schema.optional(Schema.String),
    timeout: Schema.optional(Schema.Number),
  }),
});

export type BashTool = typeof BashToolSchema.Type;

// Grep tool
export const GrepToolSchema = Schema.Struct({
  type: Schema.Literal("toolCall"),
  name: Schema.Literal("grep"),
  id: Schema.String,
  arguments: Schema.Struct({
    pattern: Schema.String,
    path: Schema.optional(Schema.String),
    glob: Schema.optional(Schema.String),
    ignoreCase: Schema.optional(Schema.Boolean),
    literal: Schema.optional(Schema.Boolean),
    context: Schema.optional(Schema.Number),
  }),
});

export type GrepTool = typeof GrepToolSchema.Type;

// Discriminated union for all builtin tool calls
export const BuiltinToolSchema = Schema.Union([
  ReadToolSchema,
  WriteToolSchema,
  EditToolSchema,
  BashToolSchema,
  GrepToolSchema,
]);

export type BuiltinTool = typeof BuiltinToolSchema.Type;
