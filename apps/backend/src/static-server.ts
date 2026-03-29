/**
 * Static file serving for compiled binary mode.
 * No-op in development (frontend runs separately via Vite).
 */

import * as Bun from "bun";
import { ASSETS_BASE } from "./config";

const CONTENT_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "application/javascript",
  mjs: "application/javascript",
  css: "text/css",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  webm: "video/webm",
  mp4: "video/mp4",
  webp: "image/webp",
};

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return CONTENT_TYPES[ext || ""] || "application/octet-stream";
}

/**
 * Serve a static file from the embedded assets.
 * Returns null if not in compiled mode or file not found.
 */
export async function serveStaticFile(path: string): Promise<Response | null> {
  // Only serve static files in compiled mode
  if (!ASSETS_BASE) return null;

  // Clean up path - remove leading slash and prevent directory traversal
  const cleanPath = path.replace(/^\//, "").replace(/\.{2,}/g, "");
  const filePath = cleanPath || "index.html";
  const fullPath = `${ASSETS_BASE}/${filePath}`;

  const file = Bun.file(fullPath);
  const exists = await file.exists();

  if (!exists) {
    return null;
  }

  return new Response(file, {
    headers: {
      "Content-Type": getContentType(filePath),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/**
 * Serve the SPA index.html for non-file routes.
 */
export async function serveIndexHtml(): Promise<Response> {
  if (!ASSETS_BASE) {
    return new Response("Not found", { status: 404 });
  }

  const file = Bun.file(`${ASSETS_BASE}/index.html`);

  if (!(await file.exists())) {
    return new Response("index.html not found. Frontend assets not embedded.", { status: 500 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
