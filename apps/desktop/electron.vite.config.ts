import { defineConfig } from "electron-vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(desktopRoot, "../..");
const backendSrc = resolve(workspaceRoot, "apps/backend/src");

export default defineConfig({
  main: {
    resolve: {
      alias: {
        "@": backendSrc,
      },
    },
    server: {
      fs: {
        allow: [workspaceRoot],
      },
    },
  },
});