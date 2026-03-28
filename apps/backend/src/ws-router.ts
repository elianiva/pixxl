/**
 * WebSocket message router.
 * Dispatches messages to RPC or terminal handlers based on connection type.
 */

import type { ServerWebSocket } from "bun";
import { RPCHandler } from "@orpc/server/bun-ws";
import { onError, ORPCError } from "@orpc/server";
import { router } from "./router";
import {
  handleTerminalConnection,
  handleTerminalMessage,
  handleTerminalClose,
} from "./features/terminal/ws-handler";
import type { WsData } from "./types";

// RPC handler singleton
const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      if (error instanceof ORPCError) {
        console.error(`[RPC Error] ${error.code}: ${error.message}`);
        if (error.data) {
          console.error("Data:", error.data);
        } else if (error.cause) {
          const issues = (error.cause as any).issues;
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

  if (data.type === "terminal") {
    handleTerminalConnection(data.terminalId, ws);
  }
}

export async function handleWsMessage(
  ws: ServerWebSocket<WsData>,
  message: string | Buffer
): Promise<void> {
  const data = ws.data;

  // Terminal connection
  if (data.type === "terminal" && data.terminalId.length > 0) {
    handleTerminalMessage(ws, message.toString());
    return;
  }

  // RPC connection (includes agent streaming)
  await rpcHandler.message(ws, message, { context: {} });
}

export function handleWsClose(ws: ServerWebSocket<WsData>): void {
  const data = ws.data;

  if (data.type === "terminal") {
    handleTerminalClose(ws);
    return;
  }

  rpcHandler.close(ws);
}
