import { Effect, Option } from "effect";
import { os } from "@/contract";
import { AgentService } from "./service";
import { AgentSessionService } from "./session";
import { ProjectService } from "../project/service";
import { mapToOrpcError } from "@/lib/error";
import type { AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import type { AgentEvent } from "@pixxl/shared";

// Session handlers use AgentSessionService.layer (already includes all dependencies)
const sessionLayer = AgentSessionService.layer;

// Agent metadata handlers
export const createAgentRpc = os.agent.createAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.createAgent(input);
    return Option.match(agent, {
      onSome: (agent) => agent,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const updateAgentRpc = os.agent.updateAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const agent = yield* service.updateAgent(input);
    return Option.match(agent, {
      onSome: (agent) => agent,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const deleteAgentRpc = os.agent.deleteAgent.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    const result = yield* service.deleteAgent(input);
    return Option.getOrElse(result, () => false);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

export const listAgentsRpc = os.agent.listAgents.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.listAgents(input);
  }).pipe(
    Effect.provide(AgentService.layer),
    mapToOrpcError({ feature: "agent" }),
    Effect.runPromise,
  ),
);

// Session management handlers
export const createSessionRpc = os.agent.createSession.handler(({ input }) =>
  Effect.gen(function* () {
    const projectService = yield* ProjectService;
    const projectResult = yield* projectService.getProjectDetail({ id: input.projectId });

    if (Option.isNone(projectResult)) {
      return yield* Effect.fail(new Error("Project not found"));
    }

    const service = yield* AgentSessionService;
    const session = yield* service.createSession({
      projectId: input.projectId,
      projectPath: projectResult.value.path,
      name: input.name,
      model: input.model,
      thinkingLevel: input.thinkingLevel,
    });

    return session;
  }).pipe(Effect.provide(sessionLayer), mapToOrpcError({ feature: "session" }), Effect.runPromise),
);

export const getSessionRpc = os.agent.getSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentSessionService;
    const session = yield* service.getSession({
      projectId: input.projectId,
      sessionId: input.sessionId,
    });
    return Option.match(session, {
      onSome: (s) => s,
      onNone: () => null,
    });
  }).pipe(Effect.provide(sessionLayer), mapToOrpcError({ feature: "session" }), Effect.runPromise),
);

export const listSessionsRpc = os.agent.listSessions.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentSessionService;
    return yield* service.listSessions({ projectId: input.projectId });
  }).pipe(Effect.provide(sessionLayer), mapToOrpcError({ feature: "session" }), Effect.runPromise),
);

export const terminateSessionRpc = os.agent.terminateSession.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentSessionService;
    yield* service.terminateSession({
      projectId: input.projectId,
      sessionId: input.sessionId,
    });
    return true;
  }).pipe(Effect.provide(sessionLayer), mapToOrpcError({ feature: "session" }), Effect.runPromise),
);

// Convert pi SDK event to server event
function convertPiToServerEvent(event: AgentSessionEvent, sessionId: string): AgentEvent {
  switch (event.type) {
    case "message_start":
    case "message_update":
    case "message_end":
      return { type: "message_delta", sessionId, delta: "" };

    case "tool_execution_start":
      return {
        type: "tool_start",
        sessionId,
        toolName: event.toolName,
        params: event.args ?? {},
      };

    case "tool_execution_update": {
      const partialResult = event.partialResult;
      return {
        type: "tool_update",
        sessionId,
        output:
          typeof partialResult === "string" ? partialResult : JSON.stringify(partialResult ?? ""),
      };
    }

    case "tool_execution_end":
      return {
        type: "tool_end",
        sessionId,
        result: event.result ?? {},
      };

    case "agent_start":
    case "turn_start":
      return { type: "status_change", sessionId, status: "streaming" };

    case "agent_end":
    case "turn_end":
      return { type: "status_change", sessionId, status: "idle" };

    default:
      return {
        type: "error",
        sessionId,
        message: `Unknown event type: ${event.type}`,
      };
  }
}

// Streaming prompt handler - simple async generator
export const promptRpc = os.agent.prompt.handler(async function* ({ input }) {
  const sessionResult = await Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* AgentSessionService;
      return yield* service.getSession({
        projectId: input.projectId,
        sessionId: input.sessionId,
      });
    }).pipe(Effect.provide(sessionLayer)),
  );

  if (Option.isNone(sessionResult)) {
    yield { type: "error" as const, sessionId: input.sessionId, message: "Session not found" };
    return;
  }

  const session = sessionResult.value;

  // Collect events from subscription
  const events: AgentEvent[] = [];

  let done = false;

  const unsubscribe = session.piSession.subscribe((event: AgentSessionEvent) => {
    const serverEvent = convertPiToServerEvent(event, input.sessionId);
    events.push(serverEvent);
  });

  // Send the prompt
  session.piSession.prompt(input.text).then(() => {
    done = true;
  });

  try {
    // Yield events as they arrive
    while (!done || events.length > 0) {
      if (events.length > 0) {
        yield events.shift()!;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  } finally {
    unsubscribe();
  }
});
