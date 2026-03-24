import { Effect, Layer, Option, Ref, ServiceMap } from "effect";
import { nanoid } from "nanoid";
import { SessionNotFoundError, SessionTerminateError } from "../error";
import { AgentSession, AgentSessionEvent, StoredSession } from "./types";
import {
  AgentSessionEvent as PiAgentSessionEvent,
  createAgentSession,
  createCodingTools,
  SettingsManager,
  type CreateAgentSessionOptions,
} from "@mariozechner/pi-coding-agent";
import { EntityService } from "@pixxl/shared";
import { ProjectService } from "../../project/service";
import { ConfigService } from "../../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";

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
    const sessionsRef = yield* Ref.make<ReadonlyMap<string, StoredSession>>(new Map());

    const createSession = Effect.fn("AgentSessionService.createSession")(function* (
      input: CreateSessionInput,
    ) {
      const sessionId = nanoid();
      const now = new Date();

      const settingsManager = SettingsManager.create(input.projectPath);
      settingsManager.setTransport("auto");

      const sessionOptions: CreateAgentSessionOptions = {
        cwd: input.projectPath,
        sessionManager: undefined,
        tools: createCodingTools(input.projectPath),
        settingsManager,
        thinkingLevel:
          (input.thinkingLevel as CreateAgentSessionOptions["thinkingLevel"]) ?? "medium",
      };

      const { session: piSession } = yield* Effect.tryPromise({
        try: () => createAgentSession(sessionOptions),
        catch: (cause) =>
          new SessionTerminateError({
            sessionId,
            projectId: input.projectId,
            cause,
          }),
      });

      const session: AgentSession = {
        id: sessionId,
        projectId: input.projectId,
        name: input.name,
        status: "idle",
        createdAt: now,
        piSession,
      };

      yield* Ref.update(sessionsRef, (sessions) =>
        new Map(sessions).set(sessionId, { session, piSession }),
      );

      return session;
    });

    const getSession = Effect.fn("AgentSessionService.getSession")(function* (
      input: GetSessionInput,
    ) {
      const sessions = yield* Ref.get(sessionsRef);
      const stored = sessions.get(input.sessionId);

      if (!stored || stored.session.projectId !== input.projectId) {
        return Option.none();
      }

      return Option.some(stored.session);
    });

    const listSessions = Effect.fn("AgentSessionService.listSessions")(function* (
      input: ListSessionsInput,
    ) {
      const sessions = yield* Ref.get(sessionsRef);

      return Array.from(sessions.values())
        .filter((stored) => stored.session.projectId === input.projectId)
        .map((stored) => stored.session);
    });

    const terminateSession = Effect.fn("AgentSessionService.terminateSession")(function* (
      input: TerminateSessionInput,
    ) {
      const sessions = yield* Ref.get(sessionsRef);
      const stored = sessions.get(input.sessionId);

      if (!stored || stored.session.projectId !== input.projectId) {
        return yield* new SessionNotFoundError({
          sessionId: input.sessionId,
          projectId: input.projectId,
        });
      }

      yield* Effect.sync(() => stored.piSession.dispose()).pipe(
        Effect.mapError(
          (cause) =>
            new SessionTerminateError({
              sessionId: input.sessionId,
              projectId: input.projectId,
              cause,
            }),
        ),
      );

      yield* Ref.update(sessionsRef, (sessions) => {
        const next = new Map(sessions);
        next.delete(input.sessionId);
        return next;
      });
    });

    return { createSession, getSession, listSessions, terminateSession } as const;
  }),
}) {
  static layer = Layer.effect(AgentSessionService, AgentSessionService.make).pipe(
    Layer.provideMerge(EntityService.layer),
    Layer.provideMerge(ProjectService.layer),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
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
