import { Schema } from "effect";
import { oc } from "@orpc/contract";
import {
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
  AgentMetadataListSchema,
  AgentMetadataSchema,
  ListAgentsInputSchema,
} from "../schema/agent";

export const createAgentContract = oc
  .input(Schema.toStandardSchemaV1(CreateAgentInputSchema))
  .output(Schema.toStandardSchemaV1(AgentMetadataSchema));

export const updateAgentContract = oc
  .input(Schema.toStandardSchemaV1(UpdateAgentInputSchema))
  .output(Schema.toStandardSchemaV1(AgentMetadataSchema));

export const listAgentsContract = oc
  .input(Schema.toStandardSchemaV1(ListAgentsInputSchema))
  .output(Schema.toStandardSchemaV1(AgentMetadataListSchema));
