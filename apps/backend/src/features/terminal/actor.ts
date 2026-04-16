import { assign, createActor, setup } from "xstate";
import { spawn, type IPty } from "zigpty";
import { homedir } from "node:os";
import { ScrollbackBuffer } from "./scrollback-buffer";

export interface TerminalActorInput {
  terminalId: string;
  shell: string;
  cwd?: string;
  scrollbackLines?: number;
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
        cwd: context.cwd ?? homedir(),
        cols: 80,
        rows: 24,
        shell: true,
        terminal: {
          data(_terminal, data) {
            const currentContext = self.getSnapshot()?.context ?? context;
            const output = new Uint8Array(data);

            currentContext.scrollback.push(output);

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
          currentContext.clients.forEach((client) => {
            if (!client.closed) {
              client.closed = true;
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
      );
      for (const chunk of context.scrollback.iter()) {
        if (!event.client.closed) {
          event.client.send(chunk);
        }
      }
    },

    writeToPty: assign({
      terminal: ({ context, event }) => {
        if (event.type !== "INPUT" || !context.terminal) return context.terminal;
        context.terminal.write(event.data);
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
            // ignore
          }
          try {
            context.terminal.close();
          } catch {
            // ignore
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
            guard: ({ context }) => context.clients.size > 1,
            actions: "removeClient",
          },
          {
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
      type: "final",
      entry: "markDead",
    },
    closing: {
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

  actor.start();
  return actor;
}

export type TerminalActor = ReturnType<typeof createTerminalActor>;