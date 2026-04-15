/**
 * HTTP request handler.
 * Routes requests to WebSocket upgrades or static file serving.
 */

import type { Server } from "bun";
import { serveStaticFile, serveIndexHtml } from "./static-server";
import type { WsData } from "./types";

const PTY_PATH = "/pty";
const RPC_PATH = "/rpc";

export async function handleRequest(
  req: Request,
  server: Server<WsData>,
): Promise<Response | void> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === PTY_PATH) {
    const terminalId = url.searchParams.get("terminalId");
    if (!terminalId) {
      return new Response("Missing terminalId", { status: 400 });
    }

    const didUpgrade = server.upgrade(req, {
      data: { type: "pty", terminalId } as WsData,
    });

    if (didUpgrade) return;
    return new Response("WebSocket upgrade failed", { status: 500 });
  }

  if (pathname === RPC_PATH || pathname.startsWith("/rpc/")) {
    const didUpgrade = server.upgrade(req, {
      data: { type: "rpc" } as WsData,
    });

    if (didUpgrade) return;
    return new Response("WebSocket upgrade required", { status: 426 });
  }

  if (!pathname.startsWith("/api") && pathname !== PTY_PATH) {
    const staticResponse = await serveStaticFile(pathname);
    if (staticResponse) return staticResponse;

    if (!pathname.includes(".")) {
      return serveIndexHtml();
    }
  }

  return new Response("Not found", { status: 404 });
}
