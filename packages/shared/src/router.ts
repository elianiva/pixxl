import { getConfigContract, updateConfigContract } from "./contracts/config";
import { getPiSettingsContract, updatePiSettingsContract } from "./contracts/pi-settings";
import {
  createProjectContract,
  deleteProjectContract,
  getProjectDetailContract,
  listProjectsContract,
} from "./contracts/project";
import {
  createAgentContract,
  getAgentContract,
  updateAgentContract,
  deleteAgentContract,
  listAgentsContract,
  attachSessionContract,
  switchSessionContract,
  createSessionContract,
  listAttachableSessionsContract,
  getAgentRuntimeContract,
  getAgentHistoryContract,
  getAgentUsageContract,
  configureAgentSessionContract,
  setAgentModelContract,
  setAgentThinkingLevelContract,
  promptAgentContract,
  subscribeAgentContract,
  enqueueAgentPromptContract,
  abortAgentContract,
  getAgentFrontendConfigContract,
  listAvailableModelsContract,
  getAgentSessionDetailsContract,
} from "./contracts/agent";
import {
  createTerminalContract,
  updateTerminalContract,
  deleteTerminalContract,
  listTerminalsContract,
  connectTerminalContract,
} from "./contracts/terminal";
import {
  createCommandContract,
  deleteCommandContract,
  listCommandsContract,
} from "./contracts/command";

export const routerContract = {
  config: {
    getConfig: getConfigContract,
    updateConfig: updateConfigContract,
  },
  pi: {
    getSettings: getPiSettingsContract,
    setSettings: updatePiSettingsContract,
  },
  project: {
    createProject: createProjectContract,
    deleteProject: deleteProjectContract,
    listProjects: listProjectsContract,
    getProjectDetail: getProjectDetailContract,
  },
  agent: {
    createAgent: createAgentContract,
    getAgent: getAgentContract,
    updateAgent: updateAgentContract,
    deleteAgent: deleteAgentContract,
    listAgents: listAgentsContract,
    attachSession: attachSessionContract,
    switchSession: switchSessionContract,
    createSession: createSessionContract,
    listAttachableSessions: listAttachableSessionsContract,
    getAgentRuntime: getAgentRuntimeContract,
    getAgentHistory: getAgentHistoryContract,
    getAgentUsage: getAgentUsageContract,
    configureAgentSession: configureAgentSessionContract,
    setAgentModel: setAgentModelContract,
    setAgentThinkingLevel: setAgentThinkingLevelContract,
    promptAgent: promptAgentContract,
    subscribeAgent: subscribeAgentContract,
    enqueueAgentPrompt: enqueueAgentPromptContract,
    abortAgent: abortAgentContract,
    getAgentFrontendConfig: getAgentFrontendConfigContract,
    listAvailableModels: listAvailableModelsContract,
    getAgentSessionDetails: getAgentSessionDetailsContract,
  },
  terminal: {
    createTerminal: createTerminalContract,
    updateTerminal: updateTerminalContract,
    deleteTerminal: deleteTerminalContract,
    listTerminals: listTerminalsContract,
    connectTerminal: connectTerminalContract,
  },
  command: {
    createCommand: createCommandContract,
    deleteCommand: deleteCommandContract,
    listCommands: listCommandsContract,
  },
};
