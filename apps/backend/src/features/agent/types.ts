import type { AgentMetadata, AgentEvent } from "@pixxl/shared";
import type { AgentSession, SessionManager, SessionEntry } from "@mariozechner/pi-coding-agent";

// Entry types from pi session
export interface ModelChangeEntry {
  type: "model_change";
  provider: string;
  modelId: string;
}

export interface ThinkingLevelChangeEntry {
  type: "thinking_level_change";
  thinkingLevel: string;
}

// Actor input
export interface AgentActorInput {
  agentId: string;
  projectId: string;
  projectPath: string;
  metadata: AgentMetadata;
  sessionManager: SessionManager;
}

// Client subscription for streaming events
export interface AgentClient {
  send: (event: AgentEvent) => void;
  closed: boolean;
  close?: () => void;
}

// Prompt mode: how to handle if agent is already streaming
export type PromptMode = "immediate" | "steer" | "followUp";

// Actor context
export interface AgentActorContext {
  agentId: string;
  projectId: string;
  projectPath: string;
  metadata: AgentMetadata;
  sessionManager: SessionManager;
  session: AgentSession | null;
  clients: Set<AgentClient>;
  error?: string;
}

// Actor events
export type AgentActorEvents =
  | { type: "CLIENT_CONNECT"; client: AgentClient }
  | { type: "CLIENT_DISCONNECT"; client: AgentClient }
  | { type: "PROMPT"; text: string; mode: PromptMode }
  | { type: "ABORT" }
  | { type: "DELETE_METADATA" }
  | { type: "HYDRATE"; metadata: AgentMetadata; sessionManager: SessionManager }
  | { type: "ATTACH_SESSION"; sessionManager: SessionManager }
  | { type: "STREAM_ERROR"; error: string }
  | { type: "AGENT_SESSION_EVENT"; event: AgentEvent };

// Re-export session entry type for use in utils
export type { SessionEntry };
