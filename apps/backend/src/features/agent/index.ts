// Unified Agent Service - agent-centric design with Pi session integration
export { AgentService } from "./service";
export { agentManager } from "./manager";
export { createAgentActor, type AgentActor, getActorRuntimeState } from "./actor";
export {
  createPiSession,
  openPiSession,
  listPiSessions,
  validateSessionFile,
  deletePiSessionFile,
  convertPiSessionInfo,
} from "./pi";
export {
  AgentNotFoundError,
  AgentCreateError,
  AgentUpdateError,
  AgentDeleteError,
  AgentAttachError,
  SessionNotFoundError,
  SessionCreateError,
  SessionTerminateError,
  PiSessionCreateError,
  PiSessionValidationError,
  type AgentError,
  isAgentError,
} from "./error";

// Legacy exports for backward compatibility during transition
export {
  createSessionRpc,
  getSessionRpc,
  listSessionsRpc,
  terminateSessionRpc,
  promptRpc,
} from "./rpc";
