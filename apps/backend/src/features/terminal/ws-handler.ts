import { Effect } from "effect";
import { WebSocket } from "ws";
import { terminalManager } from "./manager";
import { ConfigService } from "../config/service";
import type { Client } from "./actor";
import { runtime } from "@/runtime";
import type { AppSocket } from "@/types";

function toText(message: string | Buffer | ArrayBuffer | Buffer[] | Uint8Array) {
  if (typeof message === "string") return message;
  if (message instanceof ArrayBuffer) return Buffer.from(message).toString("utf8");
  if (Array.isArray(message)) return Buffer.concat(message).toString("utf8");
  return Buffer.from(message).toString("utf8");
}

function handleControlMessage(text: string, ws: AppSocket) {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return false;

    const record = parsed as { type?: unknown; cols?: unknown; rows?: unknown };
    if (record.type === "resize" && typeof record.cols === "number" && typeof record.rows === "number") {
      if (!ws.data || ws.data.type !== "pty") return true;
      if (ws.data.actor) {
        ws.data.actor.send({ type: "RESIZE", cols: record.cols, rows: record.rows });
      } else {
        ws.data.pendingResize = { cols: record.cols, rows: record.rows };
      }
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function handlePtyConnection(terminalId: string, ws: AppSocket) {
  ws.data = { type: "pty", terminalId };

  Effect.gen(function* () {
    const service = yield* ConfigService;
    return yield* service.loadConfig();
  })
    .pipe(runtime.runPromise)
    .then((cfg) => {
      const data = ws.data;
      if (!data || data.type !== "pty") return;

      const actor = terminalManager.getOrCreate({
        terminalId,
        shell: cfg.terminal.shell,
      });

      const client: Client = {
        send: (payload) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        },
        closed: false,
        close: () => {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) ws.close();
        },
      };

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
    })
    .catch((error) => {
      console.error("[PTY] Failed to attach terminal:", error);
      if (ws.readyState === WebSocket.OPEN) ws.close(1011, "Failed to start terminal");
    });

  ws.on("message", (message) => {
    const data = ws.data;
    if (!data || data.type !== "pty") return;

    const text = toText(message as string | Buffer | ArrayBuffer | Buffer[] | Uint8Array);
    if (handleControlMessage(text, ws)) return;

    if (data.actor) {
      data.actor.send({ type: "INPUT", data: text });
    }
  });

  ws.on("close", () => {
    const data = ws.data;
    if (!data || data.type !== "pty") return;
    if (!data.actor || !data.client) return;

    data.client.closed = true;
    data.actor.send({ type: "CLIENT_DISCONNECT", client: data.client });
  });
}
