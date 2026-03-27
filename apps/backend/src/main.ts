import { RPCHandler } from "@orpc/server/bun-ws";
import { onError, ORPCError } from "@orpc/server";
import { router } from "./router";
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
      if (error instanceof ORPCError) {
        // Log structured error with code and data
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
        // Log unexpected errors
        console.error("[RPC Error] Unhandled error:", error);
      }
      // Re-throw - orpc will serialize to client
      throw error;
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
