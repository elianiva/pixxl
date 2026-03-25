import { assign, createActor, fromPromise, setup } from "xstate";
import type { AgentEvent, AgentMetadata } from "@pixxl/shared";
import { createAgentSession } from "@mariozechner/pi-coding-agent";
import type { AgentSession, SessionManager } from "@mariozechner/pi-coding-agent";

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

function extractTextFromContent(content: unknown): string {
  if (!Array.isArray(content)) return "";

  const chunks: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;

    const block = item as { type?: unknown; text?: unknown };
    if (block.type === "text" && typeof block.text === "string") {
      chunks.push(block.text);
    }
  }

  return chunks.join("");
}

function extractToolOutput(partialResult: unknown): string {
  if (typeof partialResult === "string") return partialResult;
  if (!partialResult || typeof partialResult !== "object") return "";

  const value = partialResult as {
    content?: unknown;
    output?: unknown;
    details?: unknown;
  };

  const contentText = extractTextFromContent(value.content);
  if (contentText.length > 0) return contentText;

  if (typeof value.output === "string") return value.output;
  if (typeof value.details === "string") return value.details;

  return "";
}

function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (!value || typeof value !== "object") return undefined;

  const maybeError = value as {
    message?: unknown;
    errorMessage?: unknown;
    content?: unknown;
  };

  if (typeof maybeError.errorMessage === "string" && maybeError.errorMessage.length > 0) {
    return maybeError.errorMessage;
  }

  if (typeof maybeError.message === "string" && maybeError.message.length > 0) {
    return maybeError.message;
  }

  const contentText = extractTextFromContent(maybeError.content);
  if (contentText.length > 0) return contentText;

  return undefined;
}

export const agentMachine = setup({
  types: {
    context: {} as AgentActorContext,
    events: {} as AgentActorEvents,
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
    restoreQueuesToEditor: ({ context }) => {
      const steering = context.session?.getSteeringMessages() ?? [];
      const followUp = context.session?.getFollowUpMessages() ?? [];
      const allQueued = [...steering, ...followUp];
      context.clients.forEach((client) => {
        if (!client.closed) {
          client.send({
            type: "error",
            sessionId: context.agentId,
            message: `Restored queued messages: ${allQueued.join("\n")}`,
          });
        }
      });
    },
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
  },
  actors: {
    runPrompt: fromPromise(async ({ input, self }) => {
      const { session, text, mode, agentId } = input as {
        session: AgentSession;
        text: string;
        mode: PromptMode;
        agentId: string;
      };

      const emitMappedEvent = (mappedEvent: AgentEvent) => {
        self.send({ type: "AGENT_SESSION_EVENT", event: mappedEvent });
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
        // Use streamingBehavior based on mode when session is already streaming
        const options: { streamingBehavior?: "steer" | "followUp" } = {};
        if (mode !== "immediate") {
          options.streamingBehavior = mode;
        }

        await session.prompt(text, options);
      } finally {
        unsubscribe();
      }
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
        src: fromPromise(async ({ input }) => {
          const { sessionManager, projectPath } = input as {
            sessionManager: SessionManager;
            projectPath: string;
          };
          const { session } = await createAgentSession({
            sessionManager,
            cwd: projectPath,
          });
          return session;
        }),
        input: ({ context }) => ({
          sessionManager: context.sessionManager,
          projectPath: context.projectPath,
        }),
        onDone: {
          target: "ready",
          actions: assign({
            session: ({ event }) => event.output as AgentSession,
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
        PROMPT: {
          target: "streaming",
          actions: "notifyClientsStreaming",
        },
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
        src: fromPromise(async ({ input }) => {
          const { sessionManager, projectPath } = input as {
            sessionManager: SessionManager;
            projectPath: string;
          };
          const { session } = await createAgentSession({
            sessionManager,
            cwd: projectPath,
          });
          return session;
        }),
        input: ({ context }) => ({
          sessionManager: context.sessionManager,
          projectPath: context.projectPath,
        }),
        onDone: {
          target: "ready",
          actions: assign({
            session: ({ event }) => event.output as AgentSession,
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
        input: ({ context, event }) => {
          if (event.type !== "PROMPT") throw new Error("Expected PROMPT event");
          return {
            session: context.session!,
            text: event.text,
            mode: event.mode,
            agentId: context.agentId,
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
      },
    },
    deleting: {
      entry: assign({
        session: (): AgentSession | null => null,
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
        PROMPT: {
          target: "streaming",
          actions: ["clearError", "notifyClientsStreaming"],
        },
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

// Helper to get runtime state from actor
export function getActorRuntimeState(actor: AgentActor): {
  status: "idle" | "streaming" | "initializing" | "switchingSession" | "error";
  queuedSteering: string[];
  queuedFollowUp: string[];
  currentSessionFile: string;
} {
  const state = actor.getSnapshot();
  const session = state.context.session;

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
  };
}
