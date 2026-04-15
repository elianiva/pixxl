/**
 * WebSocket message router.
 * Dispatches messages to RPC or terminal handlers based on connection type.
 */

import type { ServerWebSocket } from "bun";
import { RPCHandler } from "@orpc/server/bun-ws";
import { onError, ORPCError } from "@orpc/server";
import { router } from "./router";
import {
  handlePtyConnection,
  handlePtyMessage,
  handlePtyClose,
} from "./features/terminal/ws-handler";
import type { WsData } from "./types";

const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      if (error instanceof ORPCError) {
        console.error(`[RPC Error] ${error.code}: ${error.message}`);
        if (error.data) {
          console.error("Data:", error.data);
        } else if (error.cause) {
          const cause = error.cause as { issues?: unknown };\n          const issues = cause.issues;
          console.error(issues ?? error.cause);
        } else {
          console.error(error);
        }
      } else {
        console.error("[RPC Error] Unhandled error:", error);
      }
      throw error;
    }),
  ],
});

export function handleWsOpen(ws: ServerWebSocket<WsData>): void {
  const data = ws.data;

  if (data.type === "pty") {
    handlePtyConnection(data.terminalId, ws);
  }
}

export async function handleWsMessage(
  ws: ServerWebSocket<WsData>,
  message: string | Buffer,
): Promise<void> {
  const data = ws.data;

  if (data.type === "pty" && data.terminalId.length > 0) {
    handlePtyMessage(ws, message);
    return;
  }

  await rpcHandler.message(ws, message, { context: {} });
}

export function handleWsClose(ws: ServerWebSocket<WsData>): void {
  const data = ws.data;

  if (data.type === "pty") {
    handlePtyClose(ws);
    return;
  }

  rpcHandler.close(ws);
}
