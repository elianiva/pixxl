import { RPCHandler } from "@orpc/server/bun-ws";
import { onError } from "@orpc/server";
import { router } from "./router";
import * as Bun from "bun";

const PORT = Number.parseInt(process.env.HONO_PORT || "3000", 10);

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }

    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    async message(ws, message) {
      await handler.message(ws, message, {
        context: {},
      });
    },
    close(ws) {
      handler.close(ws);
    },
  },
  port: PORT,
  development: true, // TODO: get this from env instead
});
