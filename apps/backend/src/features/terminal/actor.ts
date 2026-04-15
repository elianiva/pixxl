import { assign, createActor, setup } from "xstate";
import { spawn, type IPty } from "zigpty";
import { ScrollbackBuffer } from "./scrollback-buffer";

export interface TerminalActorInput {
  terminalId: string;
  shell: string;
  cwd?: string;
  scrollbackLines?: number; // Configurable, defaults to 10000
}

export interface Client {
  send: (data: string | Uint8Array) => void;
  closed: boolean;
  close?: () => void;
}

export interface SessionMetadata {
  createdAt: Date;
  lastActivity: Date;
  attachCount: number;
  isDetached: boolean;
  exitCode?: number;
}

export interface TerminalActorContext {
  terminalId: string;
  shell: string;
  cwd?: string;
  clients: Set<Client>;
  terminal?: IPty;
  scrollback: ScrollbackBuffer;
  metadata: SessionMetadata;
  pendingResize?: { cols: number; rows: number };
}

export type TerminalActorEvents =
  | { type: "CLIENT_CONNECT"; client: Client }
  | { type: "CLIENT_DISCONNECT"; client: Client }
  | { type: "INPUT"; data: string }
  | { type: "RESIZE"; cols: number; rows: number }
  | { type: "CLOSE" }
  | { type: "PROCESS_EXIT"; exitCode: number };

export const terminalMachine = setup({
  types: {
    context: {} as TerminalActorContext,
    events: {} as TerminalActorEvents,
    input: {} as TerminalActorInput,
  },
  actions: {
    spawnTerminal: assign(({ context, self }) => {
      console.log(
        `[TerminalActor ${context.terminalId}] SPAWNING new terminal with shell: ${context.shell}`,
      );
      const pty = spawn(context.shell, [], {
        cwd: context.cwd ?? Bun.env.HOME,
        cols: 80,
        rows: 24,
        shell: true,
        terminal: {
          data(_terminal, data) {
            const currentContext = self.getSnapshot()?.context ?? context;
            const output = new Uint8Array(data);

            // Capture to scrollback for persistence
            currentContext.scrollback.push(output);

            // Broadcast to connected clients
            currentContext.clients.forEach((client) => {
              if (!client.closed) {
                client.send(output);
              }
            });
          },
        },
        onExit(exitCode, _signal) {
          const currentContext = self.getSnapshot()?.context ?? context;
          console.log(
            `[TerminalActor ${currentContext.terminalId}] PROCESS EXIT: code=${exitCode}, signal=${_signal}`,
          );
          const message = JSON.stringify({
            type: "dead",
            exitCode,
            reason: "Process exited",
          });

          currentContext.clients.forEach((client) => {
            if (!client.closed) {
              client.closed = true;
              client.send(message);
              client.close?.();
            }
          });

          self.send({ type: "PROCESS_EXIT", exitCode });
        },
      });

      return { terminal: pty };
    }),

    addClient: assign({
      clients: ({ context, event }) => {
        if (event.type !== "CLIENT_CONNECT") return context.clients;
        console.log(
          `[TerminalActor ${context.terminalId}] CLIENT_CONNECT, clients: ${context.clients.size} -> ${context.clients.size + 1}`,
        );
        const newClients = new Set(context.clients);
        newClients.add(event.client);
        return newClients;
      },
      metadata: ({ context, event }) => {
        if (event.type !== "CLIENT_CONNECT") return context.metadata;
        return {
          ...context.metadata,
          attachCount: context.metadata.attachCount + 1,
          isDetached: false,
          lastActivity: new Date(),
        };
      },
    }),

    removeClient: assign({
      clients: ({ context, event }) => {
        if (event.type !== "CLIENT_DISCONNECT") return context.clients;
        const newClients = new Set(context.clients);
        newClients.delete(event.client);
        console.log(
          `[TerminalActor ${context.terminalId}] CLIENT_DISCONNECT, clients: ${context.clients.size} -> ${newClients.size}`,
        );
        return newClients;
      },
    }),

    clearClients: assign({
      clients: () => new Set(),
      metadata: ({ context }) => {
        console.log(`[TerminalActor ${context.terminalId}] Entering DETACHED state`);
        return {
          ...context.metadata,
          isDetached: true,
          lastActivity: new Date(),
        };
      },
    }),

    replayScrollback: ({ context, event }) => {
      if (event.type !== "CLIENT_CONNECT") return;
      console.log(
        `[TerminalActor ${context.terminalId}] Replaying ${context.scrollback.size} scrollback lines to client`,
      ); // Replay all scrollback to the new client
      for (const chunk of context.scrollback.iter()) {
        if (!event.client.closed) {
          event.client.send(chunk);
        }
      }
    },

    writeToPty: assign({
      terminal: ({ context, event }) => {
        if (event.type !== "INPUT" || !context.terminal) return context.terminal;
        const data = Buffer.from(event.data, "base64").toString("utf8");
        context.terminal.write(data);
        return context.terminal;
      },
      metadata: ({ context }) => ({
        ...context.metadata,
        lastActivity: new Date(),
      }),
    }),

    resizePty: assign({
      terminal: ({ context, event }) => {
        if (event.type !== "RESIZE" || !context.terminal) return context.terminal;
        context.terminal.resize(event.cols, event.rows);
        return context.terminal;
      },
      pendingResize: ({ context, event }) => {
        if (event.type !== "RESIZE") return context.pendingResize;
        // If terminal not ready yet, queue the resize
        if (!context.terminal) {
          return { cols: event.cols, rows: event.rows };
        }
        return undefined;
      },
    }),

    applyPendingResize: ({ context }) => {
      if (context.pendingResize && context.terminal) {
        context.terminal.resize(context.pendingResize.cols, context.pendingResize.rows);
        context.pendingResize = undefined;
      }
    },

    killTerminal: assign({
      terminal: ({ context }) => {
        if (context.terminal) {
          try {
            context.terminal.kill();
          } catch {
            // Ignore errors during cleanup
          }
          try {
            context.terminal.close();
          } catch {
            // Ignore errors during cleanup
          }
        }
        return undefined;
      },
      clients: () => new Set(),
    }),

    markDead: assign({
      metadata: ({ context, event }) => {
        const exitCode = event.type === "PROCESS_EXIT" ? event.exitCode : context.metadata.exitCode;
        return {
          ...context.metadata,
          isDetached: false,
          exitCode,
        };
      },
    }),
  },
}).createMachine({
  id: "terminal",
  initial: "idle",
  context: ({ input }) => ({
    terminalId: input.terminalId,
    shell: input.shell,
    cwd: input.cwd,
    clients: new Set<Client>(),
    scrollback: new ScrollbackBuffer(input.scrollbackLines ?? 10000),
    metadata: {
      createdAt: new Date(),
      lastActivity: new Date(),
      attachCount: 0,
      isDetached: false,
    },
  }),
  states: {
    idle: {
      on: {
        CLIENT_CONNECT: {
          target: "starting",
          actions: "addClient",
        },
        RESIZE: {
          actions: "resizePty",
        },
      },
    },

    starting: {
      entry: "spawnTerminal",
      always: "active",
      on: {
        RESIZE: {
          actions: "resizePty",
        },
      },
    },

    active: {
      entry: "applyPendingResize",
      on: {
        CLIENT_CONNECT: {
          actions: ["addClient", "replayScrollback"],
        },
        CLIENT_DISCONNECT: [
          {
            // Multiple clients remain -> stay active
            guard: ({ context }) => context.clients.size > 1,
            actions: "removeClient",
          },
          {
            // Last client left -> detach (don't kill process)
            target: "detached",
            actions: ["removeClient", "clearClients"],
          },
        ],
        INPUT: {
          actions: "writeToPty",
        },
        RESIZE: {
          actions: "resizePty",
        },
        CLOSE: "closing",
        PROCESS_EXIT: "dead",
      },
    },

    detached: {
      // Process is running but no clients connected
      // Session persists here until explicitly closed or process dies
      on: {
        CLIENT_CONNECT: {
          target: "active",
          actions: ["addClient", "replayScrollback"],
        },
        RESIZE: {
          actions: "resizePty",
        },
        CLOSE: "closing",
        PROCESS_EXIT: "dead",
      },
    },

    dead: {
      // Terminal process has exited
      // Session can be inspected but not reattached to running process
      type: "final",
      entry: "markDead",
    },

    closing: {
      // Explicit cleanup requested
      entry: "killTerminal",
      always: "closed",
    },

    closed: {
      type: "final",
    },
  },
});

export function createTerminalActor(input: TerminalActorInput) {
  const actor = createActor(terminalMachine, { input });

  // Track process state to emit PROCESS_EXIT when needed
  // Note: zigpty onExit callback handles active state
  // For detached state, process exit still flows through the same callback

  actor.start();
  return actor;
}

export type TerminalActor = ReturnType<typeof createTerminalActor>;