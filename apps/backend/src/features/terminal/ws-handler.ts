import { Effect } from "effect";
import { terminalManager } from "./manager";
import { ConfigService } from "../config/service";
import type { TerminalActor, Client } from "./actor";
import { runtime } from "@/runtime";

interface PtyWsData {
  type: "pty";
  terminalId: string;
  actor?: TerminalActor;
  client?: Client;
  pendingResize?: { cols: number; rows: number };
}

function toText(message: string | Buffer) {
  return typeof message === "string" ? message : message.toString("utf8");
}

function handleControlMessage(text: string, actor: TerminalActor) {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return false;

    const record = parsed as { type?: unknown; cols?: unknown; rows?: unknown };
    if (record.type === "resize" && typeof record.cols === "number" && typeof record.rows === "number") {
      actor.send({ type: "RESIZE", cols: record.cols, rows: record.rows });
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function handlePtyConnection(terminalId: string, ws: Bun.ServerWebSocket<unknown>) {
  Effect.gen(function* () {
    const service = yield* ConfigService;
    return yield* service.loadConfig();
  })
    .pipe(runtime.runPromise)
    .then((cfg) => {
      const actor = terminalManager.getOrCreate({
        terminalId,
        shell: cfg.terminal.shell,
      });

      const client: Client = {
        send: (data) => ws.send(data),
        closed: false,
        close: () => ws.close(),
      };

      const data = ws.data as PtyWsData;
      data.actor = actor;
      data.client = client;

      if (data.pendingResize) {
        actor.send({
          type: "RESIZE",
          cols: data.pendingResize.cols,
          rows: data.pendingResize.rows,
        });
        data.pendingResize = undefined;
      }

      actor.send({ type: "CLIENT_CONNECT", client });
    });
}

export function handlePtyMessage(ws: Bun.ServerWebSocket<unknown>, message: string | Buffer) {
  const data = ws.data as PtyWsData | undefined;
  if (!data?.actor) return;

  const text = toText(message);
  if (handleControlMessage(text, data.actor)) return;

  data.actor.send({ type: "INPUT", data: text });
}

export function handlePtyClose(ws: Bun.ServerWebSocket<unknown>) {
  const data = ws.data as PtyWsData | undefined;
  if (!data?.actor || !data?.client) return;

  data.client.closed = true;
  data.actor.send({ type: "CLIENT_DISCONNECT", client: data.client });
}
