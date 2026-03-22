import { Schema } from "effect";
import { oc } from "@orpc/contract";
import {
  CreateTerminalInputSchema,
  TerminalMetadataListSchema,
  TerminalMetadataSchema,
  ListTerminalsInputSchema,
} from "../schema/terminal";

export const createTerminalContract = oc
  .input(Schema.toStandardSchemaV1(CreateTerminalInputSchema))
  .output(Schema.toStandardSchemaV1(TerminalMetadataSchema));

export const listTerminalsContract = oc
  .input(Schema.toStandardSchemaV1(ListTerminalsInputSchema))
  .output(Schema.toStandardSchemaV1(TerminalMetadataListSchema));
