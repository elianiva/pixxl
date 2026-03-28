import { Effect } from "effect";
import { terminalManager } from "./manager";
import { ConfigService } from "../config/service";
import type { TerminalActor, Client } from "./actor";
import type { TerminalClientMessage } from "@pixxl/shared";

interface TerminalWsData {
  type: "terminal";
  terminalId: string;
  actor?: TerminalActor;
  client?: Client;
  pendingResize?: { cols: number; rows: number };
}

export function handleTerminalConnection(terminalId: string, ws: Bun.ServerWebSocket<unknown>) {
  void Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* ConfigService;
      return yield* service.loadConfig();
    }).pipe(Effect.provide(ConfigService.live)),
  ).then((cfg) => {
    const actor = terminalManager.getOrCreate({
      terminalId,
      shell: cfg.terminal.shell,
    });

    const client: Client = {
      send: (data) => ws.send(data),
      closed: false,
      close: () => ws.close(),
    };

    // Extend ws.data with actor and client (preserve terminalId from initial data)
    const data = ws.data as TerminalWsData;
    data.actor = actor;
    data.client = client;

    // Apply any pending resize that arrived before actor was ready
    if (data.pendingResize) {
      actor.send({
        type: "RESIZE",
        cols: data.pendingResize.cols,
        rows: data.pendingResize.rows,
      });
      data.pendingResize = undefined;
    }

    // Now connect the client (triggers spawn if first client)
    actor.send({ type: "CLIENT_CONNECT", client });
  });
}

export function handleTerminalMessage(ws: Bun.ServerWebSocket<unknown>, message: string) {
  const data = ws.data as TerminalWsData | undefined;
  if (!data) return;

  try {
    const parsed: TerminalClientMessage = JSON.parse(message);

    switch (parsed.type) {
      case "input":
        if (parsed.data && data.actor) {
          data.actor.send({ type: "INPUT", data: parsed.data });
        }
        break;
      case "resize":
        if (parsed.cols !== undefined && parsed.rows !== undefined) {
          if (data.actor) {
            // Actor ready - send immediately
            data.actor.send({ type: "RESIZE", cols: parsed.cols, rows: parsed.rows });
          } else {
            // Actor not ready yet - store for later
            data.pendingResize = { cols: parsed.cols, rows: parsed.rows };
          }
        }
        break;
      case "sync":
        // Trigger scrollback replay by sending CLIENT_CONNECT again
        if (data.actor && data.client) {
          data.actor.send({ type: "CLIENT_CONNECT", client: data.client });
        }
        break;
    }
  } catch {
    console.error("[Terminal] Failed to parse message:", message);
  }
}

export function handleTerminalClose(ws: Bun.ServerWebSocket<unknown>) {
  const data = ws.data as TerminalWsData | undefined;

  if (!data?.actor || !data?.client) return;

  data.client.closed = true;
  data.actor.send({ type: "CLIENT_DISCONNECT", client: data.client });
}
