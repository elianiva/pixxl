import { Schema, SchemaTransformation } from "effect";

function nameRule(name: string): string {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}

export const CreateCommandInputSchema = Schema.Struct({
  projectId: Schema.String,
  name: Schema.NonEmptyString.pipe(
    Schema.decodeTo(
      Schema.NonEmptyString,
      SchemaTransformation.transform({
        decode: nameRule,
        encode: (val) => val,
      }),
    ),
  ),
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

export const CommandMetadataListSchema = Schema.Array(CommandMetadataSchema);

export type CreateCommandInput = typeof CreateCommandInputSchema.Type;
export type CommandMetadata = typeof CommandMetadataSchema.Type;
export type CommandMetadataList = typeof CommandMetadataListSchema.Type;
export type ListCommandsInput = typeof ListCommandsInputSchema.Type;
