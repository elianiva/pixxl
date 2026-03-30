/**
 * HTTP request handler.
 * Routes requests to WebSocket upgrades or static file serving.
 */

import type { Server } from "bun";
import { serveStaticFile, serveIndexHtml } from "./static-server";
import type { WsData } from "./types";

// Route patterns
const TERMINAL_PATH_REGEX = /^\/terminal\/(.+)$/;
const RPC_PATH = "/rpc";

/**
 * Handle HTTP requests.
 * Returns Response or void (for WebSocket upgrades that handle their own response).
 */
export async function handleRequest(
  req: Request,
  server: Server<WsData>,
): Promise<Response | void> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Terminal WebSocket endpoint
  const terminalMatch = pathname.match(TERMINAL_PATH_REGEX);
  if (terminalMatch) {
    const terminalId = terminalMatch[1];
    const didUpgrade = server.upgrade(req, {
      data: { type: "terminal", terminalId } as WsData,
    });

    if (didUpgrade) {
      return; // WebSocket handles response
    }
    return new Response("WebSocket upgrade failed", { status: 500 });
  }

  // RPC WebSocket endpoint
  if (pathname === RPC_PATH || pathname.startsWith("/rpc/")) {
    const didUpgrade = server.upgrade(req, {
      data: { type: "rpc" } as WsData,
    });

    if (didUpgrade) {
      return; // WebSocket handles response
    }
    return new Response("WebSocket upgrade required", { status: 426 });
  }

  // Static file serving (only in compiled mode)
  // Skip API routes and terminal routes
  if (!pathname.startsWith("/api") && pathname !== "/terminal") {
    // Try to serve the requested file
    const staticResponse = await serveStaticFile(pathname);
    if (staticResponse) {
      return staticResponse;
    }

    // For SPA: serve index.html for any non-file route
    if (!pathname.includes(".")) {
      return serveIndexHtml();
    }
  }

  return new Response("Not found", { status: 404 });
}
