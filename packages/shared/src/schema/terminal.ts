import { Schema } from "effect";

export const CreateTerminalInputSchema = Schema.Struct({
  id: Schema.String,
  projectId: Schema.String,
  name: Schema.NonEmptyString,
});

export const UpdateTerminalInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

export const DeleteTerminalInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
});

export const TerminalMetadataSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  shell: Schema.optional(Schema.String),
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
export const GetTerminalSessionStateInputSchema = Schema.Struct({
  id: Schema.String,
});

export const TerminalSessionStateSchema = Schema.Literals(["active", "detached", "dead", "closed", "none"]);

export const GetTerminalSessionStateOutputSchema = Schema.Struct({
  state: TerminalSessionStateSchema,
});

export type ListTerminalsInput = typeof ListTerminalsInputSchema.Type;
export type GetTerminalSessionStateInput = typeof GetTerminalSessionStateInputSchema.Type;
export type TerminalSessionState = typeof TerminalSessionStateSchema.Type;
export type GetTerminalSessionStateOutput = typeof GetTerminalSessionStateOutputSchema.Type;
