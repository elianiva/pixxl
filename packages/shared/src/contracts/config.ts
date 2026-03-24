import { Schema } from "effect";
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

// For updates, we accept partial JSON object
export const UpdateConfigInputSchema = Schema.Struct({
  workspace: Schema.optionalKey(WorkspaceSchema),
  terminal: Schema.optionalKey(TerminalSchema),
  agent: Schema.optionalKey(AgentSchema),
  appearance: Schema.optionalKey(AppearanceSchema),
});
export type UpdateConfigInput = typeof UpdateConfigInputSchema.Type;

export const updateConfigContract = oc
  .input(Schema.toStandardSchemaV1(UpdateConfigInputSchema))
  .output(Schema.toStandardSchemaV1(AppConfigSchema));
