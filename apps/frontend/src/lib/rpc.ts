import { createORPCClient } from "@orpc/client";
import { ContractRouterClient } from "@orpc/contract";
import { RPCLink } from "@orpc/client/websocket";
import { routerContract } from "@pixxl/shared";

// Base WebSocket URL - no trailing /terminal or /rpc
// Use relative URL when served from same origin (production binary mode)
// Use localhost for development
const isDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  window.location.port !== "";

const WS_BASE = isDev
  ? "ws://localhost:3000"
  : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

// RPC endpoint
const RPC_WS_URL = `${WS_BASE}/rpc`;

// Terminal base endpoint (append /{terminalId} when connecting)
export const WS_URL = `${WS_BASE}/terminal`;

const websocket = new WebSocket(RPC_WS_URL);

const link = new RPCLink({
  websocket,
});

export const rpc: ContractRouterClient<typeof routerContract> = createORPCClient(link);
