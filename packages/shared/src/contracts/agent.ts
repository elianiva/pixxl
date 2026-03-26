import { Schema } from "effect";
import { oc, eventIterator } from "@orpc/contract";
import {
  CreateAgentInputSchema,
  GetAgentInputSchema,
  UpdateAgentInputSchema,
  DeleteAgentInputSchema,
  ListAgentsInputSchema,
  AgentMetadataSchema,
  AgentMetadataListSchema,
  AttachSessionInputSchema,
  SwitchSessionInputSchema,
  ListAttachableSessionsInputSchema,
  PromptAgentInputSchema,
  EnqueueAgentPromptInputSchema,
  GetAgentRuntimeInputSchema,
  GetAgentHistoryInputSchema,
  AbortAgentInputSchema,
  AgentRuntimeStateSchema,
  PiSessionInfoListSchema,
  AgentHistorySchema,
  AgentEventSchema,
} from "../schema/agent";

// Agent metadata contracts
export const createAgentContract = oc
  .input(Schema.toStandardSchemaV1(CreateAgentInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const getAgentContract = oc
  .input(Schema.toStandardSchemaV1(GetAgentInputSchema))
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

// New agent session attachment contracts
export const attachSessionContract = oc
  .input(Schema.toStandardSchemaV1(AttachSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const switchSessionContract = oc
  .input(Schema.toStandardSchemaV1(SwitchSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const listAttachableSessionsContract = oc
  .input(Schema.toStandardSchemaV1(ListAttachableSessionsInputSchema))
  .output(Schema.toStandardSchemaV1(PiSessionInfoListSchema));

// Agent runtime contracts
export const getAgentRuntimeContract = oc
  .input(Schema.toStandardSchemaV1(GetAgentRuntimeInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentRuntimeStateSchema)));

export const getAgentHistoryContract = oc
  .input(Schema.toStandardSchemaV1(GetAgentHistoryInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentHistorySchema)));

export const promptAgentContract = oc
  .input(Schema.toStandardSchemaV1(PromptAgentInputSchema))
  .output(eventIterator(Schema.toStandardSchemaV1(AgentEventSchema)));

export const enqueueAgentPromptContract = oc
  .input(Schema.toStandardSchemaV1(EnqueueAgentPromptInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));

export const abortAgentContract = oc
  .input(Schema.toStandardSchemaV1(AbortAgentInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));
