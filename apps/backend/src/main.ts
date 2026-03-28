/**
 * pixxl server entry point.
 *
 * Usage:
 *   bun src/main.ts              # Development mode
 *   ./bin/pixxl                  # Compiled binary
 *
 * The server provides:
 *   - RPC over WebSocket at /rpc
 *   - Terminal I/O at /terminal/{id}
 *   - Static frontend assets (compiled binary only)
 */

import * as Bun from "bun";
import { PORT, IS_COMPILED } from "./config";
import { handleRequest } from "./http-handler";
import {
  handleWsOpen,
  handleWsMessage,
  handleWsClose,
} from "./ws-router";
import type { WsData } from "./types";

// Import frontend HTML to trigger full-stack bundling in compiled mode
// @ts-ignore - This import is handled by Bun's bundler
import _indexHtml from "../../frontend/dist/index.html" with { type: "file" };

console.log(
  `Starting pixxl server on port ${PORT}${IS_COMPILED ? " (compiled binary mode)" : ""}`
);

Bun.serve<WsData>({
  async fetch(req, server) {
    return handleRequest(req, server);
  },
  websocket: {
    open(ws) {
      handleWsOpen(ws);
    },
    async message(ws, message) {
      await handleWsMessage(ws, message);
    },
    close(ws) {
      handleWsClose(ws);
    },
  },
  port: PORT,
  development: !IS_COMPILED,
});
