import { Schema, SchemaTransformation } from "effect";

function nameRule(name: string): string {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}

export const CreateTerminalInputSchema = Schema.Struct({
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
});

export const UpdateTerminalInputSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

export const TerminalMetadataSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const ListTerminalsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

export const TerminalMetadataListSchema = Schema.Array(TerminalMetadataSchema);

export type CreateTerminalInput = typeof CreateTerminalInputSchema.Type;
export type UpdateTerminalInput = typeof UpdateTerminalInputSchema.Type;
export type TerminalMetadata = typeof TerminalMetadataSchema.Type;
export type TerminalMetadataList = typeof TerminalMetadataListSchema.Type;
export type ListTerminalsInput = typeof ListTerminalsInputSchema.Type;
