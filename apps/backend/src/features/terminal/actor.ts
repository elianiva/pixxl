import { assign, createActor, setup } from "xstate";

export interface TerminalActorInput {
  terminalId: string;
  shell: string;
  cwd?: string;
}

export interface Client {
  send: (data: string) => void;
  closed: boolean;
}

export interface TerminalActorContext {
  terminalId: string;
  shell: string;
  cwd?: string;
  clients: Set<Client>;
  terminal?: globalThis.Bun.Terminal;
}

export type TerminalActorEvents =
  | { type: "CLIENT_CONNECT"; client: Client }
  | { type: "CLIENT_DISCONNECT"; client: Client }
  | { type: "INPUT"; data: string }
  | { type: "RESIZE"; cols: number; rows: number }
  | { type: "CLOSE" };

export const terminalMachine = setup({
  types: {
    context: {} as TerminalActorContext,
    events: {} as TerminalActorEvents,
    input: {} as TerminalActorInput,
  },
  actions: {
    spawnTerminal: assign(({ context }) => {
      const terminal = new Bun.Terminal({
        cols: 80,
        rows: 24,
        data(term, data) {
          const output = Buffer.from(data).toString("base64");
          context.clients.forEach((client) => {
            if (!client.closed) {
              client.send(JSON.stringify({ type: "output", data: output }));
            }
          });
        },
        exit(_exitCode) {
          const message = JSON.stringify({ type: "closed", reason: "Process exited" });
          context.clients.forEach((client) => {
            if (!client.closed) {
              client.send(message);
            }
          });
        },
      });

      const proc = Bun.spawn({
        cmd: ["/usr/bin/zsh"],
        cwd: context.cwd ?? Bun.env.HOME,
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        terminal,
      });

      // Connect PTY streams - pipe stdout to terminal
      if (proc.stdout) {
        proc.stdout.pipeTo(
          new WritableStream({
            write(chunk) {
              terminal.write(chunk);
            },
          }),
        );
      }

      return { terminal };
    }),
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
    writeToPty: assign({
      terminal: ({ context, event }) => {
        if (event.type !== "INPUT" || !context.terminal) return context.terminal;
        const data = Buffer.from(event.data, "base64");
        context.terminal.write(data);
        return context.terminal;
      },
    }),
    resizePty: assign({
      terminal: ({ context, event }) => {
        if (event.type !== "RESIZE" || !context.terminal) return context.terminal;
        context.terminal.resize({ cols: event.cols, rows: event.rows });
        return context.terminal;
      },
    }),
    killTerminal: assign({
      terminal: () => undefined,
      clients: () => new Set(),
    }),
  },
  guards: {
    hasClients: ({ context }) => context.clients.size > 0,
  },
}).createMachine({
  id: "terminal",
  initial: "idle",
  context: ({ input }) => ({
    terminalId: input.terminalId,
    shell: input.shell,
    cwd: input.cwd,
    clients: new Set(),
  }),
  states: {
    idle: {
      on: {
        CLIENT_CONNECT: {
          target: "starting",
        },
      },
    },
    starting: {
      entry: "spawnTerminal",
      always: "active",
    },
    active: {
      on: {
        CLIENT_CONNECT: {
          actions: "addClient",
        },
        CLIENT_DISCONNECT: [
          {
            target: "closing",
            guard: {
              type: "hasClients",
              params: ({ context }) => context.clients.size > 1,
            },
            actions: "removeClient",
          },
          {
            target: "closing",
            actions: "removeClient",
          },
        ],
        INPUT: {
          actions: "writeToPty",
        },
        RESIZE: {
          actions: "resizePty",
        },
        CLOSE: "closing",
      },
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
