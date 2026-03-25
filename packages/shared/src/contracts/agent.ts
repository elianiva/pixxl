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
  QueueSteerInputSchema,
  QueueFollowUpInputSchema,
  GetAgentRuntimeInputSchema,
  AgentRuntimeStateSchema,
  PiSessionInfoListSchema,
  // Legacy schemas
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

// Prompt and queue contracts - agent-centric
export const promptAgentContract = oc
  .input(Schema.toStandardSchemaV1(PromptAgentInputSchema))
  .output(eventIterator(Schema.toStandardSchemaV1(AgentEventSchema)));

export const queueSteerContract = oc
  .input(Schema.toStandardSchemaV1(QueueSteerInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Boolean));

export const queueFollowUpContract = oc
  .input(Schema.toStandardSchemaV1(QueueFollowUpInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Boolean));

// Legacy session contracts - deprecated
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

export const promptContract = oc
  .input(Schema.toStandardSchemaV1(PromptInputSchema))
  .output(eventIterator(Schema.toStandardSchemaV1(AgentEventSchema)));
