import { Schema } from "effect";

export const CreateTerminalInputSchema = Schema.Struct({
  id: Schema.String,
  projectId: Schema.String,
  name: Schema.NonEmptyString,
  themeId: Schema.optional(Schema.String),
  fontId: Schema.optional(Schema.String),
  fontSize: Schema.optional(Schema.Number),
});

export const UpdateTerminalInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
  name: Schema.String,
  themeId: Schema.optional(Schema.String),
  fontId: Schema.optional(Schema.String),
  fontSize: Schema.optional(Schema.Number),
});

export const DeleteTerminalInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
});

export const TerminalMetadataSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  themeId: Schema.String,
  fontId: Schema.String,
  fontSize: Schema.Number,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const ListTerminalsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

export const TerminalMetadataListSchema = Schema.Array(TerminalMetadataSchema);

export type CreateTerminalInput = typeof CreateTerminalInputSchema.Type;
export type UpdateTerminalInput = typeof UpdateTerminalInputSchema.Type;
export type DeleteTerminalInput = typeof DeleteTerminalInputSchema.Type;
export type TerminalMetadata = typeof TerminalMetadataSchema.Type;
export type TerminalMetadataList = typeof TerminalMetadataListSchema.Type;
export type ListTerminalsInput = typeof ListTerminalsInputSchema.Type;
