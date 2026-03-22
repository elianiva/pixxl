import { Schema } from "effect";
import { oc } from "@orpc/contract";
import {
  CreateProjectInputSchema,
  DeleteProjectInputSchema,
  GetProjectDetailInputSchema,
  ListProjectsInputSchema,
  ProjectDetailSchema,
  ProjectMetadataListSchema,
  ProjectMetadataSchema,
} from "../schema/project";

export const createProjectContract = oc
  .input(Schema.toStandardSchemaV1(CreateProjectInputSchema))
  .output(Schema.toStandardSchemaV1(ProjectMetadataSchema));

export const deleteProjectContract = oc
  .input(Schema.toStandardSchemaV1(DeleteProjectInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Void));

export const listProjectsContract = oc
  .input(Schema.toStandardSchemaV1(ListProjectsInputSchema))
  .output(Schema.toStandardSchemaV1(ProjectMetadataListSchema));

export const getProjectDetailContract = oc
  .input(Schema.toStandardSchemaV1(GetProjectDetailInputSchema))
  .output(Schema.toStandardSchemaV1(ProjectDetailSchema));
