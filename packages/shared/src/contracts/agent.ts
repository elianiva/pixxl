import { Schema } from "effect";
import { oc, eventIterator } from "@orpc/contract";
import {
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
  DeleteAgentInputSchema,
  ListAgentsInputSchema,
  AgentMetadataSchema,
  AgentMetadataListSchema,
  CreateSessionInputSchema,
  GetSessionInputSchema,
  ListSessionsInputSchema,
  TerminateSessionInputSchema,
  PromptInputSchema,
  AgentSessionSchema,
  AgentSessionListSchema,
  AgentEventSchema,
} from "../schema/agent";

// Agent metadata contracts
export const createAgentContract = oc
  .input(Schema.toStandardSchemaV1(CreateAgentInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const updateAgentContract = oc
  .input(Schema.toStandardSchemaV1(UpdateAgentInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const deleteAgentContract = oc
  .input(Schema.toStandardSchemaV1(DeleteAgentInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Boolean));

export const listAgentsContract = oc
  .input(Schema.toStandardSchemaV1(ListAgentsInputSchema))
  .output(Schema.toStandardSchemaV1(AgentMetadataListSchema));

// Session contracts
export const createSessionContract = oc
  .input(Schema.toStandardSchemaV1(CreateSessionInputSchema))
  .output(Schema.toStandardSchemaV1(AgentSessionSchema));

export const getSessionContract = oc
  .input(Schema.toStandardSchemaV1(GetSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentSessionSchema)));

export const listSessionsContract = oc
  .input(Schema.toStandardSchemaV1(ListSessionsInputSchema))
  .output(Schema.toStandardSchemaV1(AgentSessionListSchema));

export const terminateSessionContract = oc
  .input(Schema.toStandardSchemaV1(TerminateSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Boolean));

// Streaming prompt contract using eventIterator
export const promptContract = oc
  .input(Schema.toStandardSchemaV1(PromptInputSchema))
  .output(eventIterator(Schema.toStandardSchemaV1(AgentEventSchema)));
