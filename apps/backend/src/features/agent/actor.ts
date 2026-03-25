import { assign, createActor, setup } from "xstate";
import type { AgentMetadata, AgentEvent } from "@pixxl/shared";
import type { ReadonlySessionManager } from "@mariozechner/pi-coding-agent";

// Actor input
export interface AgentActorInput {
  agentId: string;
  projectId: string;
  projectPath: string;
  metadata: AgentMetadata;
  sessionManager: ReadonlySessionManager;
}

// Client subscription for streaming events
export interface AgentClient {
  send: (event: AgentEvent) => void;
  closed: boolean;
  close?: () => void;
}

// Actor context
export interface AgentActorContext {
  agentId: string;
  projectId: string;
  projectPath: string;
  metadata: AgentMetadata;
  sessionManager: ReadonlySessionManager;
  clients: Set<AgentClient>;
  queuedSteering: string[];
  queuedFollowUp: string[];
  error?: string;
}

// Actor events
export type AgentActorEvents =
  | { type: "CLIENT_CONNECT"; client: AgentClient }
  | { type: "CLIENT_DISCONNECT"; client: AgentClient }
  | { type: "PROMPT"; text: string }
  | { type: "QUEUE_STEER"; text: string }
  | { type: "QUEUE_FOLLOW_UP"; text: string }
  | { type: "ATTACH_SESSION"; sessionManager: ReadonlySessionManager }
  | { type: "ABORT" }
  | { type: "DELETE_METADATA" }
  | { type: "HYDRATE"; metadata: AgentMetadata; sessionManager: ReadonlySessionManager }
  | { type: "STREAM_START" }
  | { type: "STREAM_END" }
  | { type: "STREAM_ERROR"; error: string };

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
    queueSteering: assign({
      queuedSteering: ({ context, event }) => {
        if (event.type !== "QUEUE_STEER") return context.queuedSteering;
        return [...context.queuedSteering, event.text];
      },
    }),
    queueFollowUp: assign({
      queuedFollowUp: ({ context, event }) => {
        if (event.type !== "QUEUE_FOLLOW_UP") return context.queuedFollowUp;
        return [...context.queuedFollowUp, event.text];
      },
    }),
    clearQueues: assign({
      queuedSteering: () => [],
      queuedFollowUp: () => [],
    }),
    restoreQueuesToEditor: ({ context }) => {
      // On abort, restore queued messages back to editor/input
      // This is a side effect that would notify clients
      const allQueued = [...context.queuedSteering, ...context.queuedFollowUp];
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
    attachSession: assign({
      sessionManager: ({ event }) => {
        if (event.type !== "ATTACH_SESSION") {
          throw new Error("attachSession action called with wrong event type");
        }
        return event.sessionManager;
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
    setError: assign({
      error: ({ event }) => {
        if (event.type !== "STREAM_ERROR") return undefined;
        return event.error;
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
        if (!client.closed && context.error) {
          client.send({
            type: "error",
            sessionId: context.agentId,
            message: context.error,
          });
        }
      });
    },
  },
  guards: {
    hasQueuedSteering: ({ context }) => context.queuedSteering.length > 0,
    hasQueuedFollowUp: ({ context }) => context.queuedFollowUp.length > 0,
    noClients: ({ context }) => context.clients.size === 0,
  },
}).createMachine({
  id: "agent",
  initial: "hydrating",
  context: ({ input }) => ({
    agentId: input.agentId,
    projectId: input.projectId,
    projectPath: input.projectPath,
    metadata: input.metadata,
    sessionManager: input.sessionManager,
    clients: new Set(),
    queuedSteering: [],
    queuedFollowUp: [],
  }),
  states: {
    hydrating: {
      on: {
        HYDRATE: {
          target: "ready",
          actions: "updateMetadata",
        },
      },
    },
    ready: {
      entry: ["clearError", "notifyClientsIdle"],
      on: {
        CLIENT_CONNECT: {
          actions: "addClient",
        },
        CLIENT_DISCONNECT: [
          {
            guard: "noClients",
            actions: "removeClient",
          },
          {
            actions: "removeClient",
          },
        ],
        PROMPT: {
          target: "streaming",
          actions: "notifyClientsStreaming",
        },
        QUEUE_STEER: {
          actions: "queueSteering",
        },
        QUEUE_FOLLOW_UP: {
          actions: "queueFollowUp",
        },
        ATTACH_SESSION: {
          target: "switchingSession",
        },
        DELETE_METADATA: {
          target: "deleting",
        },
      },
    },
    streaming: {
      entry: "notifyClientsStreaming",
      on: {
        CLIENT_CONNECT: {
          actions: "addClient",
        },
        CLIENT_DISCONNECT: {
          actions: "removeClient",
        },
        QUEUE_STEER: {
          actions: "queueSteering",
        },
        QUEUE_FOLLOW_UP: {
          actions: "queueFollowUp",
        },
        ABORT: {
          target: "ready",
          actions: ["restoreQueuesToEditor", "clearQueues", "notifyClientsIdle"],
        },
        STREAM_END: {
          target: "ready",
          actions: ["clearQueues", "notifyClientsIdle"],
        },
        STREAM_ERROR: {
          target: "error",
          actions: ["setError", "notifyClientsError"],
        },
      },
    },
    switchingSession: {
      entry: "clearError",
      on: {
        HYDRATE: {
          target: "ready",
          actions: ["updateMetadata", "notifyClientsIdle"],
        },
        STREAM_ERROR: {
          target: "error",
          actions: ["setError", "notifyClientsError"],
        },
      },
    },
    deleting: {
      entry: () => {
        // Cleanup happens when actor reaches final state
      },
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

// Helper to get actor snapshot
export function getActorState(actor: AgentActor) {
  return actor.getSnapshot();
}

// Helper to get runtime state from actor
export function getActorRuntimeState(actor: AgentActor): {
  status: "idle" | "streaming" | "switchingSession" | "error";
  queuedSteering: string[];
  queuedFollowUp: string[];
} {
  const state = actor.getSnapshot();
  return {
    status: state.matches("ready")
      ? "idle"
      : state.matches("streaming")
        ? "streaming"
        : state.matches("switchingSession")
          ? "switchingSession"
          : "error",
    queuedSteering: state.context.queuedSteering,
    queuedFollowUp: state.context.queuedFollowUp,
  };
}
