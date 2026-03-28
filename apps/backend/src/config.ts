/**
 * Server configuration.
 * Environment-agnostic - works in both dev and compiled modes.
 */

// Check if running as compiled binary
export const IS_COMPILED =
  import.meta.main && !process.execPath.endsWith("bun");

// Server port
export const PORT = Number.parseInt(
  process.env.HONO_PORT || process.env.PORT || "3000",
  10
);

// Asset base path - only set when compiled
export const ASSETS_BASE = IS_COMPILED
  ? new URL("apps/frontend/dist", import.meta.url).pathname
  : null;

// Development mode flag
export const IS_DEV = !IS_COMPILED;
