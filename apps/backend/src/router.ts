import { os } from "./contract";
import { getConfigRpc, updateConfigRpc } from "./features/config/rpc";
import {
  createProjectRpc,
  deleteProjectRpc,
  getProjectDetailRpc,
  listProjectsRpc,
} from "./features/project/rpc";
import {
  createAgentRpc,
  updateAgentRpc,
  deleteAgentRpc,
  listAgentsRpc,
  createSessionRpc,
  getSessionRpc,
  listSessionsRpc,
  terminateSessionRpc,
  promptRpc,
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
  project: {
    createProject: createProjectRpc,
    deleteProject: deleteProjectRpc,
    listProjects: listProjectsRpc,
    getProjectDetail: getProjectDetailRpc,
  },
  agent: {
    createAgent: createAgentRpc,
    updateAgent: updateAgentRpc,
    deleteAgent: deleteAgentRpc,
    listAgents: listAgentsRpc,
    createSession: createSessionRpc,
    getSession: getSessionRpc,
    listSessions: listSessionsRpc,
    terminateSession: terminateSessionRpc,
    prompt: promptRpc,
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
