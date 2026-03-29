import { Schema } from "effect";
import { oc } from "@orpc/contract";
import {
  CreateTerminalInputSchema,
  UpdateTerminalInputSchema,
  DeleteTerminalInputSchema,
  TerminalMetadataListSchema,
  TerminalMetadataSchema,
  ListTerminalsInputSchema,
} from "../schema/terminal";

export const createTerminalContract = oc
  .input(Schema.toStandardSchemaV1(CreateTerminalInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(TerminalMetadataSchema)));

export const updateTerminalContract = oc
  .input(Schema.toStandardSchemaV1(UpdateTerminalInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(TerminalMetadataSchema)));

export const deleteTerminalContract = oc
  .input(Schema.toStandardSchemaV1(DeleteTerminalInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Boolean));

export const listTerminalsContract = oc
  .input(Schema.toStandardSchemaV1(ListTerminalsInputSchema))
  .output(Schema.toStandardSchemaV1(TerminalMetadataListSchema));

export const connectTerminalContract = oc
  .input(Schema.toStandardSchemaV1(Schema.Struct({ id: Schema.String, projectId: Schema.String })))
  .output(
    Schema.toStandardSchemaV1(
      Schema.Struct({
        success: Schema.Boolean,
        websocketUrl: Schema.String,
      }),
    ),
  );
