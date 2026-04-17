/**
 * WebSocket RPC entrypoint.
 */

import { RPCHandler } from "@orpc/server/ws";
import { onError, ORPCError } from "@orpc/server";
import { router } from "./router";
import type { AppSocket } from "./types";

const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      if (error instanceof ORPCError) {
        console.error(`[RPC Error] ${error.code}: ${error.message}`);
        if (error.data) {
          console.error("Data:", error.data);
        } else if (error.cause) {
          const cause = error.cause as { issues?: unknown };
          const issues = cause.issues;
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

export function handleRpcConnection(ws: AppSocket): void {
  ws.data = { type: "rpc" };
  void rpcHandler.upgrade(ws);
}
