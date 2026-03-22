import { Schema, SchemaTransformation } from "effect";

function nameRule(name: string): string {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}

export const CreateAgentInputSchema = Schema.Struct({
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

export const UpdateAgentInputSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

export const AgentMetadataSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const ListAgentsInputSchema = Schema.Struct({
  projectId: Schema.String,
});

export const AgentMetadataListSchema = Schema.Array(AgentMetadataSchema);

export type CreateAgentInput = typeof CreateAgentInputSchema.Type;
export type UpdateAgentInput = typeof UpdateAgentInputSchema.Type;
export type AgentMetadata = typeof AgentMetadataSchema.Type;
export type AgentMetadataList = typeof AgentMetadataListSchema.Type;
export type ListAgentsInput = typeof ListAgentsInputSchema.Type;
