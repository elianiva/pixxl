import { Schema } from "effect";

export const CreateCommandInputSchema = Schema.Struct({
  projectId: Schema.String,
  name: Schema.NonEmptyString,
  command: Schema.String,
  description: Schema.String,
});

export const CommandMetadataSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  command: Schema.String,
  description: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const ListCommandsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

export const DeleteCommandInputSchema = Schema.Struct({
  projectId: Schema.String,
  id: Schema.String,
});

export const CommandMetadataListSchema = Schema.Array(CommandMetadataSchema);

export type CreateCommandInput = typeof CreateCommandInputSchema.Type;
export type DeleteCommandInput = typeof DeleteCommandInputSchema.Type;
export type CommandMetadata = typeof CommandMetadataSchema.Type;
export type CommandMetadataList = typeof CommandMetadataListSchema.Type;
export type ListCommandsInput = typeof ListCommandsInputSchema.Type;
