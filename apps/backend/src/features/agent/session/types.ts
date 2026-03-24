import type {
  AgentSession as PiAgentSession,
  AgentSessionEvent as PiAgentSessionEvent,
} from "@mariozechner/pi-coding-agent";

/**
 * Status of an agent session
 */
export type AgentSessionStatus = "idle" | "streaming" | "error";

/**
 * Represents an active agent session
 */
export interface AgentSession {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly status: AgentSessionStatus;
  readonly createdAt: Date;
  readonly piSession: PiAgentSession;
}

/**
 * Events emitted by agent sessions
 */
export type AgentSessionEvent =
  | MessageDeltaEvent
  | ThinkingDeltaEvent
  | ToolStartEvent
  | ToolUpdateEvent
  | ToolEndEvent
  | StatusChangeEvent
  | ErrorEvent;

export interface MessageDeltaEvent {
  readonly sessionId: string;
  readonly type: "message_delta";
  readonly content: string;
}

export interface ThinkingDeltaEvent {
  readonly sessionId: string;
  readonly type: "thinking_delta";
  readonly content: string;
}

export interface ToolStartEvent {
  readonly sessionId: string;
  readonly type: "tool_start";
  readonly toolName: string;
  readonly input: unknown;
}

export interface ToolUpdateEvent {
  readonly sessionId: string;
  readonly type: "tool_update";
  readonly toolName: string;
  readonly output: unknown;
}

export interface ToolEndEvent {
  readonly sessionId: string;
  readonly type: "tool_end";
  readonly toolName: string;
}

export interface StatusChangeEvent {
  readonly sessionId: string;
  readonly type: "status_change";
  readonly status: AgentSessionStatus;
}

export interface ErrorEvent {
  readonly sessionId: string;
  readonly type: "error";
  readonly error: string;
}

/**
 * Internal representation of a stored session with its pi session reference
 */
export interface StoredSession {
  readonly session: AgentSession;
  readonly piSession: PiAgentSession;
}

// Re-export pi SDK types for convenience
export type { PiAgentSession, PiAgentSessionEvent };
