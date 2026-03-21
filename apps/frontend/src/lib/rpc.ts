import { createORPCClient } from "@orpc/client";
import { ContractRouterClient } from "@orpc/contract";
import { RPCLink } from "@orpc/client/websocket";
import { routerContract } from "@pixxl/shared";

const websocket = new WebSocket("ws://localhost:3000");

const link = new RPCLink({
  websocket,
});

export const rpc: ContractRouterClient<typeof routerContract> = createORPCClient(link);
