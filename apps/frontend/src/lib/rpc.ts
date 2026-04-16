import { createORPCClient } from "@orpc/client";
import { ContractRouterClient } from "@orpc/contract";
import { RPCLink } from "@orpc/client/websocket";
import { routerContract } from "@pixxl/shared";

const searchParams = new URLSearchParams(window.location.search);
const backendPort = searchParams.get("backendPort");
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsHost = backendPort
  ? `127.0.0.1:${backendPort}`
  : window.location.port === "5173"
    ? "127.0.0.1:3000"
    : window.location.host || "127.0.0.1:3000";
export const WS_BASE = `${wsProtocol}//${wsHost}`;

const RPC_WS_URL = `${WS_BASE}/rpc`;

const websocket = new WebSocket(RPC_WS_URL);

const link = new RPCLink({
  websocket,
});

export const rpc: ContractRouterClient<typeof routerContract> = createORPCClient(link);