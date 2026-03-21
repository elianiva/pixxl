import { Schema, Struct } from "effect";
import { oc } from "@orpc/contract";
import {
  AgentSchema,
  AppearanceSchema,
  AppConfigSchema,
  TerminalSchema,
  WorkspaceSchema,
} from "../schema/config";

export const getConfigContract = oc
  .input(Schema.toStandardSchemaV1(Schema.Void))
  .output(Schema.toStandardSchemaV1(AppConfigSchema));

const UpdateConfigInputSchema = Schema.Struct({
  workspace: Schema.optionalKey(WorkspaceSchema.mapFields(Struct.map(Schema.optionalKey))),
  terminal: Schema.optionalKey(TerminalSchema.mapFields(Struct.map(Schema.optionalKey))),
  agent: Schema.optionalKey(AgentSchema.mapFields(Struct.map(Schema.optionalKey))),
  appearance: Schema.optionalKey(AppearanceSchema.mapFields(Struct.map(Schema.optionalKey))),
});
export type UpdateConfigInput = typeof UpdateConfigInputSchema.Type;

export const updateConfigContract = oc
  .input(Schema.toStandardSchemaV1(UpdateConfigInputSchema))
  .output(Schema.toStandardSchemaV1(AppConfigSchema));
