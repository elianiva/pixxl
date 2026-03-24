import { Effect, Layer, Option, ServiceMap } from "effect";
import { nanoid } from "nanoid";
import { SessionNotFoundError, SessionTerminateError } from "../error";
import { AgentSession, AgentSessionEvent, StoredSession } from "./types";
import {
  AgentSession as PiAgentSession,
  AgentSessionEvent as PiAgentSessionEvent,
  createAgentSession,
  createCodingTools,
  SettingsManager,
  type CreateAgentSessionOptions,
} from "@mariozechner/pi-coding-agent";

type AgentSessionServiceShape = {
  readonly createSession: (
    input: CreateSessionInput,
  ) => Effect.Effect<AgentSession, SessionTerminateError>;
  readonly getSession: (
    input: GetSessionInput,
  ) => Effect.Effect<Option.Option<AgentSession>, never>;
  readonly listSessions: (input: ListSessionsInput) => Effect.Effect<AgentSession[]>;
  readonly terminateSession: (
    input: TerminateSessionInput,
  ) => Effect.Effect<void, SessionNotFoundError | SessionTerminateError>;
};

export interface CreateSessionInput {
  readonly projectId: string;
  readonly projectPath: string;
  readonly name: string;
  readonly model?: string;
  readonly thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

export interface GetSessionInput {
  readonly projectId: string;
  readonly sessionId: string;
}

export interface ListSessionsInput {
  readonly projectId: string;
}

export interface TerminateSessionInput {
  readonly projectId: string;
  readonly sessionId: string;
}

export class AgentSessionService extends ServiceMap.Service<
  AgentSessionService,
  AgentSessionServiceShape
>()("@pixxl/AgentSessionService", {
  make: Effect.gen(function* () {
    // Internal storage: sessionId → StoredSession
    const sessions = new Map<string, StoredSession>();

    const createSession = Effect.fn("AgentSessionService.createSession")(function* (
      input: CreateSessionInput,
    ) {
      const sessionId = nanoid();
      const now = new Date();

      // Create settings manager with WebSocket transport
      const settingsManager = SettingsManager.create(input.projectPath);
      settingsManager.setTransport("websocket");

      // Configure session options
      const sessionOptions: CreateAgentSessionOptions = {
        cwd: input.projectPath,
        // Use default session manager
        sessionManager: undefined,
        // Tools - coding tools resolve paths relative to projectPath
        tools: createCodingTools(input.projectPath),
        // Settings manager with WebSocket transport configured
        settingsManager,
        // Thinking level
        thinkingLevel:
          (input.thinkingLevel as CreateAgentSessionOptions["thinkingLevel"]) ?? "medium",
      };

      // Create pi session
      const { session: piSession } = yield* Effect.tryPromise({
        try: () => createAgentSession(sessionOptions),
        catch: (cause) =>
          new SessionTerminateError({
            sessionId,
            projectId: input.projectId,
            cause,
          }),
      });

      // Create our session wrapper
      const session: AgentSession = {
        id: sessionId,
        projectId: input.projectId,
        name: input.name,
        status: "idle",
        createdAt: now,
        piSession,
      };

      sessions.set(sessionId, {
        session,
        piSession,
      });

      return session;
    });

    const getSession = Effect.fn("AgentSessionService.getSession")(function* (
      input: GetSessionInput,
    ) {
      const stored = sessions.get(input.sessionId);

      if (!stored || stored.session.projectId !== input.projectId) {
        return Option.none();
      }

      return Option.some(stored.session);
    });

    const listSessions = Effect.fn("AgentSessionService.listSessions")(function* (
      input: ListSessionsInput,
    ) {
      const result: AgentSession[] = [];

      for (const stored of sessions.values()) {
        if (stored.session.projectId === input.projectId) {
          result.push(stored.session);
        }
      }

      return result;
    });

    const terminateSession = Effect.fn("AgentSessionService.terminateSession")(function* (
      input: TerminateSessionInput,
    ) {
      const stored = sessions.get(input.sessionId);

      if (!stored || stored.session.projectId !== input.projectId) {
        return yield* new SessionNotFoundError({
          sessionId: input.sessionId,
          projectId: input.projectId,
        });
      }

      try {
        // Dispose the pi session
        stored.piSession.dispose();
      } catch (cause) {
        return yield* new SessionTerminateError({
          sessionId: input.sessionId,
          projectId: input.projectId,
          cause,
        });
      }

      sessions.delete(input.sessionId);
    });

    return { createSession, getSession, listSessions, terminateSession } as const;
  }),
}) {
  static layer = Layer.effect(AgentSessionService, AgentSessionService.make);
}

/**
 * Convert pi SDK AgentEvent to our AgentSessionEvent
 */
export function convertPiEvent(event: PiAgentSessionEvent): AgentSessionEvent {
  switch (event.type) {
    case "agent_start":
      return { type: "status_change", sessionId: "", status: "streaming" };
    case "agent_end":
      return { type: "status_change", sessionId: "", status: "idle" };
    case "message_start":
      return {
        type: "message_delta",
        sessionId: "",
        content: "",
      };
    case "message_update":
      return {
        type: "message_delta",
        sessionId: "",
        content: "",
      };
    case "message_end":
      return {
        type: "message_delta",
        sessionId: "",
        content: "",
      };
    case "turn_start":
      return { type: "status_change", sessionId: "", status: "streaming" };
    case "turn_end":
      return { type: "status_change", sessionId: "", status: "idle" };
    case "tool_execution_start":
      return {
        type: "tool_start",
        sessionId: "",
        toolName: event.toolName,
        input: event.args,
      };
    case "tool_execution_update":
      return {
        type: "tool_update",
        sessionId: "",
        toolName: event.toolName,
        output: event.partialResult,
      };
    case "tool_execution_end":
      return {
        type: "tool_end",
        sessionId: "",
        toolName: event.toolName,
      };
    default:
      return { type: "error", sessionId: "", error: "Unknown event type" };
  }
}
