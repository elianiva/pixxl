import { defineConfig } from "electron-vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(desktopRoot, "../..");

export default defineConfig({
  main: {
    resolve: {
      alias: [
        {
          find: /^@pixxl\/shared$/,
          replacement: resolve(workspaceRoot, "packages/shared/src/index.ts"),
        },
        {
          find: /^@pixxl\/shared\/(.*)$/,
          replacement: resolve(workspaceRoot, "packages/shared/src/$1"),
        },
      ],
    },
    build: {
      target: "node22",
      lib: {
        entry: "src/main.ts",
        formats: ["es"],
      },
      outDir: "dist/main",
      externalizeDeps: {
        exclude: ["@pixxl/shared"],
      },
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