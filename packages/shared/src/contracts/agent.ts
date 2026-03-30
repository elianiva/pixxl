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
  CreateSessionInputSchema,
  ListAttachableSessionsInputSchema,
  PromptAgentInputSchema,
  SubscribeAgentInputSchema,
  ConfigureAgentSessionInputSchema,
  SetAgentModelInputSchema,
  SetAgentThinkingLevelInputSchema,
  EnqueueAgentPromptInputSchema,
  GetAgentRuntimeInputSchema,
  GetAgentHistoryInputSchema,
  AbortAgentInputSchema,
  GetAgentUsageInputSchema,
  AgentRuntimeStateSchema,
  AgentUsageSchema,
  PiSessionInfoListSchema,
  AgentHistorySchema,
  AgentFrontendConfigSchema,
  PiAvailableModelListSchema,
  GetAgentSessionDetailsInputSchema,
  AgentSessionDetailsSchema,
  AgentStreamItemSchema,
} from "../schema/agent";

// ============================================================================
// Agent Metadata Contracts
// ============================================================================

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

// ============================================================================
// Session Attachment Contracts
// ============================================================================

export const attachSessionContract = oc
  .input(Schema.toStandardSchemaV1(AttachSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const switchSessionContract = oc
  .input(Schema.toStandardSchemaV1(SwitchSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const createSessionContract = oc
  .input(Schema.toStandardSchemaV1(CreateSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentMetadataSchema)));

export const listAttachableSessionsContract = oc
  .input(Schema.toStandardSchemaV1(ListAttachableSessionsInputSchema))
  .output(Schema.toStandardSchemaV1(PiSessionInfoListSchema));

// ============================================================================
// Agent Runtime Contracts
// ============================================================================

export const getAgentRuntimeContract = oc
  .input(Schema.toStandardSchemaV1(GetAgentRuntimeInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentRuntimeStateSchema)));

export const getAgentHistoryContract = oc
  .input(Schema.toStandardSchemaV1(GetAgentHistoryInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentHistorySchema)));

export const getAgentUsageContract = oc
  .input(Schema.toStandardSchemaV1(GetAgentUsageInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentUsageSchema)));

export const getAgentSessionDetailsContract = oc
  .input(Schema.toStandardSchemaV1(GetAgentSessionDetailsInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.NullOr(AgentSessionDetailsSchema)));

// ============================================================================
// Configuration Contracts
// ============================================================================

export const configureAgentSessionContract = oc
  .input(Schema.toStandardSchemaV1(ConfigureAgentSessionInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));

export const setAgentModelContract = oc
  .input(Schema.toStandardSchemaV1(SetAgentModelInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));

export const setAgentThinkingLevelContract = oc
  .input(Schema.toStandardSchemaV1(SetAgentThinkingLevelInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));

// ============================================================================
// Prompt Contracts
// ============================================================================

// Fire-and-forget: starts prompt, returns immediately
export const promptAgentContract = oc
  .input(Schema.toStandardSchemaV1(PromptAgentInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));

export const enqueueAgentPromptContract = oc
  .input(Schema.toStandardSchemaV1(EnqueueAgentPromptInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));

export const abortAgentContract = oc
  .input(Schema.toStandardSchemaV1(AbortAgentInputSchema))
  .output(Schema.toStandardSchemaV1(Schema.Null));

// ============================================================================
// Subscription Contract - CURSOR-BASED
// ============================================================================

// Returns snapshot then live events. Resume with afterSeq.
export const subscribeAgentContract = oc
  .input(Schema.toStandardSchemaV1(SubscribeAgentInputSchema))
  .output(eventIterator(Schema.toStandardSchemaV1(AgentStreamItemSchema)));

// ============================================================================
// Frontend Config Contracts
// ============================================================================

export const getAgentFrontendConfigContract = oc
  .input(Schema.toStandardSchemaV1(Schema.Void))
  .output(Schema.toStandardSchemaV1(AgentFrontendConfigSchema));

export const listAvailableModelsContract = oc
  .input(Schema.toStandardSchemaV1(Schema.Void))
  .output(Schema.toStandardSchemaV1(PiAvailableModelListSchema));
