import { os } from "./contract";
import { getConfigRpc, updateConfigRpc } from "./features/config/rpc";
import { getPiSettingsRpc, updatePiSettingsRpc } from "./features/pi-settings/rpc";
import {
  createProjectRpc,
  deleteProjectRpc,
  getProjectDetailRpc,
  listProjectsRpc,
} from "./features/project/rpc";
import {
  createAgentRpc,
  getAgentRpc,
  updateAgentRpc,
  deleteAgentRpc,
  listAgentsRpc,
  attachSessionRpc,
  switchSessionRpc,
  createSessionRpc,
  listAttachableSessionsRpc,
  getAgentRuntimeRpc,
  getAgentHistoryRpc,
  getAgentUsageRpc,
  configureAgentSessionRpc,
  setAgentModelRpc,
  setAgentThinkingLevelRpc,
  promptAgentRpc,
  enqueueAgentPromptRpc,
  abortAgentRpc,
  getAgentFrontendConfigRpc,
  listAvailableModelsRpc,
  getAgentSessionDetailsRpc,
} from "./features/agent/rpc";
import {
  createTerminalRpc,
  updateTerminalRpc,
  deleteTerminalRpc,
  listTerminalsRpc,
  connectTerminalRpc,
} from "./features/terminal/rpc";
import { createCommandRpc, deleteCommandRpc, listCommandsRpc } from "./features/command/rpc";

export const router = os.router({
  config: {
    getConfig: getConfigRpc,
    updateConfig: updateConfigRpc,
  },
  pi: {
    getSettings: getPiSettingsRpc,
    setSettings: updatePiSettingsRpc,
  },
  project: {
    createProject: createProjectRpc,
    deleteProject: deleteProjectRpc,
    listProjects: listProjectsRpc,
    getProjectDetail: getProjectDetailRpc,
  },
  agent: {
    createAgent: createAgentRpc,
    getAgent: getAgentRpc,
    updateAgent: updateAgentRpc,
    deleteAgent: deleteAgentRpc,
    listAgents: listAgentsRpc,
    attachSession: attachSessionRpc,
    switchSession: switchSessionRpc,
    createSession: createSessionRpc,
    listAttachableSessions: listAttachableSessionsRpc,
    getAgentRuntime: getAgentRuntimeRpc,
    getAgentHistory: getAgentHistoryRpc,
    getAgentUsage: getAgentUsageRpc,
    configureAgentSession: configureAgentSessionRpc,
    setAgentModel: setAgentModelRpc,
    setAgentThinkingLevel: setAgentThinkingLevelRpc,
    promptAgent: promptAgentRpc,
    enqueueAgentPrompt: enqueueAgentPromptRpc,
    abortAgent: abortAgentRpc,
    getAgentFrontendConfig: getAgentFrontendConfigRpc,
    listAvailableModels: listAvailableModelsRpc,
    getAgentSessionDetails: getAgentSessionDetailsRpc,
  },
  terminal: {
    createTerminal: createTerminalRpc,
    updateTerminal: updateTerminalRpc,
    deleteTerminal: deleteTerminalRpc,
    listTerminals: listTerminalsRpc,
    connectTerminal: connectTerminalRpc,
  },
  command: {
    createCommand: createCommandRpc,
    deleteCommand: deleteCommandRpc,
    listCommands: listCommandsRpc,
  },
});
