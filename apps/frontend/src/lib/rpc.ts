import { createORPCClient } from "@orpc/client";
import { ContractRouterClient } from "@orpc/contract";
import { RPCLink } from "@orpc/client/websocket";
import { routerContract } from "@pixxl/shared";

export const WS_URL = "ws://localhost:3000";

const websocket = new WebSocket(WS_URL);

const link = new RPCLink({
  websocket,
});

export const rpc: ContractRouterClient<typeof routerContract> = createORPCClient(link);
