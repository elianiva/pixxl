import { Schema } from "effect";
import { oc } from "@orpc/contract";
import { AppConfigSchema, PartialAppConfigSchema } from "../schema/config";

export const getConfigContract = oc
  .input(Schema.toStandardSchemaV1(Schema.Void))
  .output(Schema.toStandardSchemaV1(AppConfigSchema));

export const UpdateConfigInputSchema = PartialAppConfigSchema;
export type UpdateConfigInput = typeof UpdateConfigInputSchema.Type;

export const updateConfigContract = oc
  .input(Schema.toStandardSchemaV1(UpdateConfigInputSchema))
  .output(Schema.toStandardSchemaV1(AppConfigSchema));
