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
  id: Schema.String,
  name: Schema.String,
  path: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const ListProjectsInputSchema = Schema.Struct({
  onlyRecents: Schema.optionalKey(Schema.Boolean),
});

export const ProjectMetadataListSchema = Schema.Array(ProjectMetadataSchema);

export const DeleteProjectInputSchema = Schema.Struct({
  id: Schema.String,
});

export const GetProjectDetailInputSchema = Schema.Struct({
  id: Schema.String,
});

export const AgentSchema = Schema.Struct({
  name: Schema.String,
  provider: Schema.String,
  model: Schema.String,
  maxTokens: Schema.Number,
  temperature: Schema.Number,
});

export const ProjectDetailSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  path: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  agents: Schema.Array(AgentSchema),
});

export type CreateProjectInput = typeof CreateProjectInputSchema.Type;
export type ListProjectsInput = typeof ListProjectsInputSchema.Type;
export type ProjectMetadata = typeof ProjectMetadataSchema.Type;
export type ProjectMetadataList = typeof ProjectMetadataListSchema.Type;
export type DeleteProjectInput = typeof DeleteProjectInputSchema.Type;
export type GetProjectDetailInput = typeof GetProjectDetailInputSchema.Type;
export type ProjectDetail = typeof ProjectDetailSchema.Type;
