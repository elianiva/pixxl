import { os } from "./contract";
import { getConfigRpc, updateConfigRpc } from "./features/config/rpc";
import {
  createProjectRpc,
  deleteProjectRpc,
  getProjectDetailRpc,
  listProjectsRpc,
} from "./features/project/rpc";
import { createAgentRpc, updateAgentRpc, listAgentsRpc } from "./features/agent/rpc";
import { createTerminalRpc, updateTerminalRpc, listTerminalsRpc } from "./features/terminal/rpc";
import { createCommandRpc, listCommandsRpc } from "./features/command/rpc";

export const router = os.router({
  config: {
    getConfig: getConfigRpc,
    updateConfig: updateConfigRpc,
  },
  project: {
    createProject: createProjectRpc,
    deleteProject: deleteProjectRpc,
    listProjects: listProjectsRpc,
    getProjectDetail: getProjectDetailRpc,
  },
  agent: {
    createAgent: createAgentRpc,
    updateAgent: updateAgentRpc,
    listAgents: listAgentsRpc,
  },
  terminal: {
    createTerminal: createTerminalRpc,
    updateTerminal: updateTerminalRpc,
    listTerminals: listTerminalsRpc,
  },
  command: {
    createCommand: createCommandRpc,
    listCommands: listCommandsRpc,
  },
});
