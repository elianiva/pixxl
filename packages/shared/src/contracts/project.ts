import { Schema } from "effect";
import { oc } from "@orpc/contract";
import { CreateProjectInputSchema, ProjectMetadataSchema } from "../schema/project";

export const createProjectContract = oc
  .input(Schema.toStandardSchemaV1(CreateProjectInputSchema))
  .output(Schema.toStandardSchemaV1(ProjectMetadataSchema));
