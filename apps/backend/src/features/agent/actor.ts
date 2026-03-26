import { assign, createActor, fromPromise, setup } from "xstate";
import type { AgentEvent } from "@pixxl/shared";
import {
  createPiSession,
  type AgentActorInput,
  type PromptMode,
  type AgentActorContext,
  type AgentActorEvents,
} from "./types";
import { extractTextFromContent, extractToolOutput, extractErrorMessage } from "./utils";

// Actor context type for setup
type ActorContext = AgentActorContext;
type ActorEvents = AgentActorEvents;

export const agentMachine = setup({
  types: {
    context: {} as ActorContext,
    events: {} as ActorEvents,
    input: {} as AgentActorInput,
  },
  actions: {
    addClient: assign({
      clients: ({ context, event }) => {
        if (event.type !== "CLIENT_CONNECT") return context.clients;
        const newClients = new Set(context.clients);
        newClients.add(event.client);
        return newClients;
      },
    }),
    removeClient: assign({
      clients: ({ context, event }) => {
        if (event.type !== "CLIENT_DISCONNECT") return context.clients;
        const newClients = new Set(context.clients);
        newClients.delete(event.client);
        return newClients;
      },
    }),
    updateMetadata: assign({
      metadata: ({ context, event }) => {
        if (event.type !== "HYDRATE") return context.metadata;
        return event.metadata;
      },
      sessionManager: ({ context, event }) => {
        if (event.type !== "HYDRATE") return context.sessionManager;
        return event.sessionManager;
      },
    }),
    updateSessionManager: assign({
      sessionManager: ({ context, event }) => {
        if (event.type !== "ATTACH_SESSION") return context.sessionManager;
        return event.sessionManager;
      },
    }),
    setError: assign({
      error: ({ event }) => {
        if (event.type === "STREAM_ERROR") return event.error;

        const maybeEvent = event as { error?: unknown };
        return extractErrorMessage(maybeEvent.error) ?? "Unknown error";
      },
    }),
    clearError: assign({
      error: () => undefined,
    }),
    notifyClientsStreaming: ({ context }) => {
      context.clients.forEach((client) => {
        if (!client.closed) {
          client.send({
            type: "status_change",
            sessionId: context.agentId,
            status: "streaming",
          });
        }
      });
    },
    notifyClientsIdle: ({ context }) => {
      context.clients.forEach((client) => {
        if (!client.closed) {
          client.send({
            type: "status_change",
            sessionId: context.agentId,
            status: "idle",
          });
        }
      });
    },
    notifyClientsError: ({ context }) => {
      context.clients.forEach((client) => {
        if (!client.closed) {
          client.send({
            type: "error",
            sessionId: context.agentId,
            message: context.error ?? "Unknown error",
          });
        }
      });
    },
    forwardSessionEvent: ({ context, event }) => {
      if (event.type !== "AGENT_SESSION_EVENT") return;
      const sessionEvent = event.event;

      context.clients.forEach((client) => {
        if (!client.closed) {
          client.send(sessionEvent);
        }
      });
    },
    runQueuedPrompt: ({ context, event }) => {
      if (event.type !== "PROMPT") return;
      if (!context.session) return;
      if (event.mode === "immediate") return;
      void context.session.prompt(event.text, { streamingBehavior: event.mode });
    },
    abortPrompt: ({ context }) => {
      if (!context.session) return;
      void context.session.abort();
    },
  },
  actors: {
    runPrompt: fromPromise(async ({ input }) => {
      const { session, text, mode, agentId, parent } = input as {
        session: NonNullable<ActorContext["session"]>;
        text: string;
        mode: PromptMode;
        agentId: string;
        parent: { send: (event: { type: string; event: AgentEvent }) => void };
      };

      const emitMappedEvent = (mappedEvent: AgentEvent) => {
        parent.send({ type: "AGENT_SESSION_EVENT", event: mappedEvent });
      };

      let sawAssistantTextDelta = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsubscribe = session.subscribe((event: any) => {
        switch (event.type) {
          case "message_update": {
            const assistantMessageEvent = event.assistantMessageEvent as {
              type?: string;
              delta?: unknown;
            };

            if (assistantMessageEvent?.type === "text_delta") {
              sawAssistantTextDelta = true;
              emitMappedEvent({
                type: "message_delta",
                sessionId: agentId,
                delta: String(assistantMessageEvent.delta ?? ""),
              });
            }

            if (assistantMessageEvent?.type === "thinking_delta") {
              emitMappedEvent({
                type: "thinking_delta",
                sessionId: agentId,
                delta: String(assistantMessageEvent.delta ?? ""),
              });
            }
            break;
          }

          case "message_end": {
            const message = event.message as {
              role?: unknown;
              content?: unknown;
              stopReason?: unknown;
              errorMessage?: unknown;
            };

            if (message?.role !== "assistant") break;

            if (!sawAssistantTextDelta) {
              const fullText = extractTextFromContent(message.content);
              if (fullText.length > 0) {
                emitMappedEvent({
                  type: "message_delta",
                  sessionId: agentId,
                  delta: fullText,
                });
              }
            }

            if (message.stopReason === "error" || message.stopReason === "aborted") {
              emitMappedEvent({
                type: "error",
                sessionId: agentId,
                message: String(message.errorMessage ?? "Prompt failed"),
              });
            }
            break;
          }

          case "tool_execution_start": {
            emitMappedEvent({
              type: "tool_start",
              sessionId: agentId,
              toolName: String(event.toolName ?? "unknown"),
              params: event.args ?? {},
            });
            break;
          }

          case "tool_execution_update": {
            const output = extractToolOutput(event.partialResult);
            if (output.length > 0) {
              emitMappedEvent({
                type: "tool_update",
                sessionId: agentId,
                output,
              });
            }
            break;
          }

          case "tool_execution_end": {
            emitMappedEvent({
              type: "tool_end",
              sessionId: agentId,
              result: event.result ?? null,
              error: event.isError ? extractErrorMessage(event.result) : undefined,
            });
            break;
          }

          case "auto_compaction_end": {
            if (event.errorMessage) {
              emitMappedEvent({
                type: "error",
                sessionId: agentId,
                message: String(event.errorMessage),
              });
            }
            break;
          }
        }
      });

      try {
        const options: { streamingBehavior?: "steer" | "followUp" } = {};
        if (mode !== "immediate") {
          options.streamingBehavior = mode;
        }

        await session.prompt(text, options);
      } finally {
        unsubscribe();
      }
    }),
    initializeSession: fromPromise(async ({ input }) => {
      const { projectPath } = input as {
        projectPath: string;
      };

      const { session } = await createPiSession(projectPath);
      return session;
    }),
    switchSession: fromPromise(async ({ input }) => {
      const { projectPath } = input as {
        projectPath: string;
      };

      const { session } = await createPiSession(projectPath);
      return session;
    }),
  },
}).createMachine({
  id: "agent",
  initial: "initializing",
  context: ({ input }) => ({
    agentId: input.agentId,
    projectId: input.projectId,
    projectPath: input.projectPath,
    metadata: input.metadata,
    sessionManager: input.sessionManager,
    session: null,
    clients: new Set(),
    error: undefined,
  }),
  states: {
    initializing: {
      entry: ["clearError"],
      invoke: {
        src: "initializeSession",
        input: ({ context }) => ({
          sessionManager: context.sessionManager,
          projectPath: context.projectPath,
        }),
        onDone: {
          target: "ready",
          actions: assign({
            session: ({ event }) => event.output,
          }),
        },
        onError: {
          target: "error",
          actions: ["setError", "notifyClientsError"],
        },
      },
    },
    ready: {
      entry: ["clearError", "notifyClientsIdle"],
      on: {
        CLIENT_CONNECT: {
          actions: "addClient",
        },
        CLIENT_DISCONNECT: {
          actions: "removeClient",
        },
        PROMPT: [
          {
            guard: ({ event }) => event.type === "PROMPT" && event.mode === "immediate",
            target: "streaming",
            actions: "notifyClientsStreaming",
          },
          {
            actions: "runQueuedPrompt",
          },
        ],
        HYDRATE: {
          actions: "updateMetadata",
        },
        ATTACH_SESSION: {
          target: "switchingSession",
          actions: "updateSessionManager",
        },
        DELETE_METADATA: {
          target: "deleting",
        },
      },
    },
    switchingSession: {
      entry: ["notifyClientsIdle"],
      invoke: {
        src: "switchSession",
        input: ({ context }) => ({
          sessionManager: context.sessionManager,
          projectPath: context.projectPath,
        }),
        onDone: {
          target: "ready",
          actions: assign({
            session: ({ event }) => event.output,
          }),
        },
        onError: {
          target: "error",
          actions: ["setError", "notifyClientsError"],
        },
      },
    },
    streaming: {
      entry: "notifyClientsStreaming",
      invoke: {
        src: "runPrompt",
        input: ({ context, event, self }) => {
          if (event.type !== "PROMPT") throw new Error("Expected PROMPT event");
          return {
            session: context.session!,
            text: event.text,
            mode: event.mode,
            agentId: context.agentId,
            parent: self,
          };
        },
        onDone: {
          target: "ready",
          actions: ["notifyClientsIdle"],
        },
        onError: {
          target: "error",
          actions: ["setError", "notifyClientsError"],
        },
      },
      on: {
        CLIENT_CONNECT: {
          actions: "addClient",
        },
        CLIENT_DISCONNECT: {
          actions: "removeClient",
        },
        AGENT_SESSION_EVENT: {
          actions: "forwardSessionEvent",
        },
        ABORT: {
          target: "ready",
          actions: ["abortPrompt", "notifyClientsIdle"],
        },
      },
    },
    deleting: {
      entry: assign({
        session: (): ActorContext["session"] => null,
      }),
      always: "deleted",
    },
    error: {
      on: {
        CLIENT_CONNECT: {
          actions: "addClient",
        },
        CLIENT_DISCONNECT: {
          actions: "removeClient",
        },
        PROMPT: [
          {
            guard: ({ event }) => event.type === "PROMPT" && event.mode === "immediate",
            target: "streaming",
            actions: ["clearError", "notifyClientsStreaming"],
          },
          {
            actions: ["clearError", "runQueuedPrompt"],
          },
        ],
        HYDRATE: {
          target: "ready",
          actions: "updateMetadata",
        },
        DELETE_METADATA: {
          target: "deleting",
        },
      },
    },
    deleted: {
      type: "final",
    },
  },
});

export function createAgentActor(input: AgentActorInput) {
  const actor = createActor(agentMachine, { input });
  actor.start();
  return actor;
}

export type AgentActor = ReturnType<typeof createAgentActor>;

export async function waitForActorReady(actor: AgentActor) {
  const snapshot = actor.getSnapshot();
  if (snapshot.matches("ready") && snapshot.context.session) {
    return snapshot.context.session;
  }

  if (snapshot.matches("streaming") && snapshot.context.session) {
    return snapshot.context.session;
  }

  if (snapshot.matches("deleted")) {
    throw new Error("Agent deleted");
  }

  if (snapshot.matches("error")) {
    throw new Error(snapshot.context.error ?? "Agent failed to initialize");
  }

  return await new Promise<NonNullable<ActorContext["session"]>>((resolve, reject) => {
    const subscription = actor.subscribe((state) => {
      if ((state.matches("ready") || state.matches("streaming")) && state.context.session) {
        subscription.unsubscribe();
        resolve(state.context.session);
        return;
      }

      if (state.matches("deleted")) {
        subscription.unsubscribe();
        reject(new Error("Agent deleted"));
        return;
      }

      if (state.matches("error")) {
        subscription.unsubscribe();
        reject(new Error(state.context.error ?? "Agent failed to initialize"));
      }
    });
  });
}

export async function configureActorSession(
  actor: AgentActor,
  input: {
    model: { provider: string; id: string };
    thinkingLevel: string;
  },
) {
  const session = await waitForActorReady(actor);

  const { getModel } = await import("@mariozechner/pi-ai");
  const model = getModel(input.model.provider as never, input.model.id as never);
  await session.setModel(model);
  session.setThinkingLevel(input.thinkingLevel as never);
}

// Helper to get runtime state from actor
export function getActorRuntimeState(actor: AgentActor): {
  status: "idle" | "streaming" | "initializing" | "switchingSession" | "error";
  queuedSteering: string[];
  queuedFollowUp: string[];
  currentSessionFile: string;
  model?: { provider: string; id: string; name: string };
  thinkingLevel: string;
} {
  const state = actor.getSnapshot();
  const session = state.context.session;
  const model = session?.model;

  return {
    status: state.matches("ready")
      ? "idle"
      : state.matches("streaming")
        ? "streaming"
        : state.matches("initializing")
          ? "initializing"
          : state.matches("switchingSession")
            ? "switchingSession"
            : "error",
    queuedSteering: [...(session?.getSteeringMessages() ?? [])],
    queuedFollowUp: [...(session?.getFollowUpMessages() ?? [])],
    currentSessionFile:
      state.context.sessionManager.getSessionFile() ?? state.context.metadata.pi.sessionFile,
    ...(model
      ? {
          model: {
            provider: String(model.provider),
            id: String(model.id),
            name: String(model.name ?? model.id),
          },
        }
      : {}),
    thinkingLevel: session?.supportsThinking() ? String(session.thinkingLevel) : "off",
  };
}
