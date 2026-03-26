import { getConfigContract, updateConfigContract } from "./contracts/config";
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
  listAttachableSessionsContract,
  getAgentRuntimeContract,
  getAgentHistoryContract,
  configureAgentSessionContract,
  promptAgentContract,
  enqueueAgentPromptContract,
  abortAgentContract,
  getAgentFrontendConfigContract,
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
    listAttachableSessions: listAttachableSessionsContract,
    getAgentRuntime: getAgentRuntimeContract,
    getAgentHistory: getAgentHistoryContract,
    configureAgentSession: configureAgentSessionContract,
    promptAgent: promptAgentContract,
    enqueueAgentPrompt: enqueueAgentPromptContract,
    abortAgent: abortAgentContract,
    getAgentFrontendConfig: getAgentFrontendConfigContract,
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
