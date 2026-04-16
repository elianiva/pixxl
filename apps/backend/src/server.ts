import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer } from "ws";
import { DEFAULT_BACKEND_HOST } from "./config";
import { disposeRuntime } from "./runtime";
import { handleRpcConnection } from "./ws-router";
import { handlePtyConnection } from "./features/terminal/ws-handler";
import type { AppSocket } from "./types";

export interface BackendServer {
  readonly port: number;
  readonly close: () => Promise<void>;
}

function getPathname(request: import("node:http").IncomingMessage): string {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? DEFAULT_BACKEND_HOST}`);
  return url.pathname;
}

export async function startBackendServer(options: { port?: number } = {}): Promise<BackendServer> {
  const server = createServer((_, response) => {
    response.statusCode = 404;
    response.end("Not found");
  });

  const rpcWss = new WebSocketServer({ noServer: true });
  const ptyWss = new WebSocketServer({ noServer: true });

  rpcWss.on("connection", (ws: AppSocket) => {
    handleRpcConnection(ws);
  });

  ptyWss.on("connection", (ws: AppSocket, request) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? DEFAULT_BACKEND_HOST}`);
    const terminalId = url.searchParams.get("terminalId");
    if (!terminalId) {
      ws.close(1008, "Missing terminalId");
      return;
    }

    handlePtyConnection(terminalId, ws);
  });

  server.on("upgrade", (request, socket, head) => {
    const pathname = getPathname(request);

    if (pathname === "/rpc") {
      rpcWss.handleUpgrade(request, socket, head, (ws) => {
        rpcWss.emit("connection", ws, request);
      });
      return;
    }

    if (pathname === "/pty") {
      ptyWss.handleUpgrade(request, socket, head, (ws) => {
        ptyWss.emit("connection", ws, request);
      });
      return;
    }

    socket.destroy();
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port ?? 0, DEFAULT_BACKEND_HOST, resolve);
  });

  const address = server.address() as AddressInfo;
  const port = address.port;

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    ptyWss.close();
    rpcWss.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await disposeRuntime();
  };

  return { port, close };
}