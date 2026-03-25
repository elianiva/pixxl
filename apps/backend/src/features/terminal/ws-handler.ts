import { Effect } from "effect";
import { terminalManager } from "./manager";
import { ConfigService } from "../config/service";
import type { TerminalActor, Client } from "./actor";
import type { TerminalClientMessage } from "@pixxl/shared/types";

interface TerminalWsData {
  type: "terminal";
  terminalId: string;
  actor: TerminalActor;
  client: Client;
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

    actor.send({ type: "CLIENT_CONNECT", client });

    // Extend ws.data with actor and client (preserve terminalId from initial data)
    const data = ws.data as TerminalWsData;
    data.actor = actor;
    data.client = client;
  });
}

export function handleTerminalMessage(ws: Bun.ServerWebSocket<unknown>, message: string) {
  const data = ws.data as TerminalWsData | undefined;

  if (!data?.actor || !data?.client) return;

  try {
    const parsed: TerminalClientMessage = JSON.parse(message);

    switch (parsed.type) {
      case "input":
        if (parsed.data) {
          data.actor.send({ type: "INPUT", data: parsed.data });
        }
        break;
      case "resize":
        if (parsed.cols !== undefined && parsed.rows !== undefined) {
          data.actor.send({ type: "RESIZE", cols: parsed.cols, rows: parsed.rows });
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
