import { createORPCClient } from "@orpc/client";
import { ContractRouterClient } from "@orpc/contract";
import { RPCLink } from "@orpc/client/websocket";
import { routerContract } from "@pixxl/shared";

const isDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  window.location.port !== "";

export const WS_BASE = isDev
  ? "ws://localhost:3000"
  : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

const RPC_WS_URL = `${WS_BASE}/rpc`;

const websocket = new WebSocket(RPC_WS_URL);

const link = new RPCLink({
  websocket,
});

export const rpc: ContractRouterClient<typeof routerContract> = createORPCClient(link);