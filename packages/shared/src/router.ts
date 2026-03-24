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
