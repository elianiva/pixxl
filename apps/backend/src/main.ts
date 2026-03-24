import { RPCHandler } from "@orpc/server/bun-ws";
import { onError, ORPCError } from "@orpc/server";
import { router } from "./router";
import { getRpcErrorResponse } from "./lib/error";
import {
  handleTerminalConnection,
  handleTerminalMessage,
  handleTerminalClose,
} from "./features/terminal/ws-handler";
import type { TerminalActor, Client } from "./features/terminal/actor";
import * as Bun from "bun";

interface TerminalWsData {
  type: "terminal";
  terminalId: string;
  actor?: TerminalActor;
  client?: Client;
}

interface RpcWsData {
  type: "rpc";
}

type WsData = TerminalWsData | RpcWsData;

const PORT = Number.parseInt(process.env.HONO_PORT || "3000", 10);

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      // Check if it's our structured error response
      const errorResponse = getRpcErrorResponse(error);

      if (errorResponse) {
        // Log structured error with context
        console.error(
          `[${errorResponse.error.feature}] ${errorResponse.error.code}: ${errorResponse.error.message}`,
        );
        if (errorResponse.error.details) {
          console.error("Details:", errorResponse.error.details);
        }

        // Re-throw as ORPCError with the structured data
        // orpc will serialize this to the frontend
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: errorResponse.error.message,
          data: errorResponse,
        });
      }

      // For unhandled errors, log and throw generic error
      console.error("Unhandled error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }),
  ],
});

Bun.serve<WsData>({
  fetch(req, server) {
    const url = new URL(req.url);

    // Extract terminalId from path
    const terminalId = url.pathname.match(/^\/terminal\/(.+)$/)?.at(1);
    if (terminalId) {
      if (
        server.upgrade(req, {
          data: { type: "terminal", terminalId } as TerminalWsData,
        })
      ) {
        return;
      }
      return new Response("Upgrade failed", { status: 500 });
    }

    // Default: RPC
    if (
      server.upgrade(req, {
        data: { type: "rpc" } as RpcWsData,
      })
    ) {
      return;
    }

    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    async message(ws, message) {
      const data = ws.data as WsData;

      // Terminal connection
      if (data.type === "terminal" && data.terminalId.length > 0) {
        handleTerminalMessage(ws, message.toString());
        return;
      }

      // RPC connection (includes agent streaming)
      await handler.message(ws, message, {
        context: {},
      });
    },
    close(ws) {
      const data = ws.data as WsData;

      if (data.type === "terminal") {
        handleTerminalClose(ws);
        return;
      }

      handler.close(ws);
    },
    open(ws) {
      const data = ws.data as WsData;

      if (data.type === "terminal") {
        handleTerminalConnection(data.terminalId, ws);
      }
    },
  },
  port: PORT,
  development: true, // TODO: get this from env instead
});
