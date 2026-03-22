import { Schema } from "effect";
import { oc } from "@orpc/contract";
import {
  CreateCommandInputSchema,
  DeleteCommandInputSchema,
  CommandMetadataListSchema,
  CommandMetadataSchema,
  ListCommandsInputSchema,
} from "../schema/command";

export const createCommandContract = oc
  .input(Schema.toStandardSchemaV1(CreateCommandInputSchema))
  .output(Schema.toStandardSchemaV1(CommandMetadataSchema));

export const deleteCommandContract = oc
  .input(Schema.toStandardSchemaV1(DeleteCommandInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Boolean));

export const listCommandsContract = oc
  .input(Schema.toStandardSchemaV1(ListCommandsInputSchema))
  .output(Schema.toStandardSchemaV1(CommandMetadataListSchema));
