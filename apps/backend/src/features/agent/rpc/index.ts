// Agent RPC handlers - organized by domain

// CRUD operations
export { getAgentRpc, createAgentRpc, updateAgentRpc, deleteAgentRpc, listAgentsRpc } from "./crud";

// Session management
export {
  attachSessionRpc,
  switchSessionRpc,
  createSessionRpc,
  listAttachableSessionsRpc,
} from "./session";

// Runtime queries
export {
  getAgentRuntimeRpc,
  getAgentHistoryRpc,
  getAgentUsageRpc,
  getAgentSessionDetailsRpc,
} from "./runtime";

// Configuration
export { configureAgentSessionRpc, setAgentModelRpc, setAgentThinkingLevelRpc } from "./config";

// Commands (fire-and-forget)
export { promptAgentRpc, enqueueAgentPromptRpc, abortAgentRpc } from "./commands";

// Subscription (cursor-based streaming)
export { subscribeAgentRpc } from "./subscription";

// Frontend config
export { getAgentFrontendConfigRpc, listAvailableModelsRpc } from "./frontend-config";
