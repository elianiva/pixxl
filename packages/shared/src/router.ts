import { getConfigContract, updateConfigContract } from "./contracts/config";
import {
  createProjectContract,
  deleteProjectContract,
  getProjectDetailContract,
  listProjectsContract,
} from "./contracts/project";
import { createAgentContract, updateAgentContract, listAgentsContract } from "./contracts/agent";
import {
  createTerminalContract,
  updateTerminalContract,
  listTerminalsContract,
} from "./contracts/terminal";
import { createCommandContract, listCommandsContract } from "./contracts/command";

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
    listAgents: listAgentsContract,
  },
  terminal: {
    createTerminal: createTerminalContract,
    updateTerminal: updateTerminalContract,
    listTerminals: listTerminalsContract,
  },
  command: {
    createCommand: createCommandContract,
    listCommands: listCommandsContract,
  },
};
