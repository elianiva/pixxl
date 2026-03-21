import { Schema, SchemaTransformation } from "effect";

function projectNameRule(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const CreateProjectInputSchema = Schema.Struct({
  name: Schema.NonEmptyString.pipe(
    Schema.decodeTo(
      Schema.NonEmptyString,
      SchemaTransformation.transform({
        decode: projectNameRule,
        encode: (val) => val,
      }),
    ),
  ),
});

export const ProjectMetadataSchema = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  createdAt: Schema.String,
});

export type CreateProjectInput = typeof CreateProjectInputSchema.Type;
export type ProjectMetadata = typeof ProjectMetadataSchema.Type;
