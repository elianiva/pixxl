import type { router } from "@/server/router";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";

const websocket = new WebSocket("ws://localhost:3000");

const link = new RPCLink({
  websocket,
});

export const rpc: RouterClient<typeof router> = createORPCClient(link);
