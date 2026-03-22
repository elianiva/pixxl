import { getConfigContract, updateConfigContract } from "./contracts/config";
import {
  createProjectContract,
  deleteProjectContract,
  getProjectDetailContract,
  listProjectsContract,
} from "./contracts/project";
import { createAgentContract, listAgentsContract } from "./contracts/agent";
import { createTerminalContract, listTerminalsContract } from "./contracts/terminal";
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
    listAgents: listAgentsContract,
  },
  terminal: {
    createTerminal: createTerminalContract,
    listTerminals: listTerminalsContract,
  },
  command: {
    createCommand: createCommandContract,
    listCommands: listCommandsContract,
  },
};
