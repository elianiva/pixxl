import { Schema } from "effect";
import { oc } from "@orpc/contract";
import {
  AgentListSchema,
  CreateProjectInputSchema,
  DeleteProjectInputSchema,
  GetProjectDetailInputSchema,
  ListAgentsInputSchema,
  ListProjectsInputSchema,
  ListTerminalsInputSchema,
  ProjectDetailSchema,
  ProjectMetadataListSchema,
  ProjectMetadataSchema,
  TerminalListSchema,
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

export const listAgentsContract = oc
  .input(Schema.toStandardSchemaV1(ListAgentsInputSchema))
  .output(Schema.toStandardSchemaV1(AgentListSchema));

export const listTerminalsContract = oc
  .input(Schema.toStandardSchemaV1(ListTerminalsInputSchema))
  .output(Schema.toStandardSchemaV1(TerminalListSchema));
