import { getConfigContract, updateConfigContract } from "./contracts/config";
import {
  createProjectContract,
  deleteProjectContract,
  getProjectDetailContract,
  listProjectsContract,
} from "./contracts/project";
import {
  createAgentContract,
  updateAgentContract,
  deleteAgentContract,
  listAgentsContract,
  attachSessionContract,
  switchSessionContract,
  listAttachableSessionsContract,
  getAgentRuntimeContract,
  promptAgentContract,
  queueSteerContract,
  queueFollowUpContract,
  // Legacy contracts
  createSessionContract,
  getSessionContract,
  listSessionsContract,
  terminateSessionContract,
  promptContract,
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
    updateAgent: updateAgentContract,
    deleteAgent: deleteAgentContract,
    listAgents: listAgentsContract,
    // New agent session attachment contracts
    attachSession: attachSessionContract,
    switchSession: switchSessionContract,
    listAttachableSessions: listAttachableSessionsContract,
    getAgentRuntime: getAgentRuntimeContract,
    // Prompt and queue contracts
    promptAgent: promptAgentContract,
    queueSteer: queueSteerContract,
    queueFollowUp: queueFollowUpContract,
    // Legacy contracts - deprecated
    createSession: createSessionContract,
    getSession: getSessionContract,
    listSessions: listSessionsContract,
    terminateSession: terminateSessionContract,
    prompt: promptContract,
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
