import { defineConfig } from "electron-vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(desktopRoot, "../..");

export default defineConfig({
  main: {
    build: {
      target: "node22",
      lib: {
        entry: "src/main.ts",
        formats: ["es"],
      },
      outDir: "dist/main",
    },
    server: {
      fs: {
        allow: [workspaceRoot],
      },
    },
  },
  preload: {
    build: {
      target: "node22",
      lib: {
        entry: "src/preload.ts",
        formats: ["es"],
      },
      outDir: "dist/preload",
    },
  },
});