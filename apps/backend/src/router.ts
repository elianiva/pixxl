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
  getAgentRpc,
  updateAgentRpc,
  deleteAgentRpc,
  listAgentsRpc,
  attachSessionRpc,
  switchSessionRpc,
  listAttachableSessionsRpc,
  getAgentRuntimeRpc,
  getAgentHistoryRpc,
  configureAgentSessionRpc,
  promptAgentRpc,
  enqueueAgentPromptRpc,
  abortAgentRpc,
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
    getAgent: getAgentRpc,
    updateAgent: updateAgentRpc,
    deleteAgent: deleteAgentRpc,
    listAgents: listAgentsRpc,
    attachSession: attachSessionRpc,
    switchSession: switchSessionRpc,
    listAttachableSessions: listAttachableSessionsRpc,
    getAgentRuntime: getAgentRuntimeRpc,
    getAgentHistory: getAgentHistoryRpc,
    configureAgentSession: configureAgentSessionRpc,
    promptAgent: promptAgentRpc,
    enqueueAgentPrompt: enqueueAgentPromptRpc,
    abortAgent: abortAgentRpc,
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
