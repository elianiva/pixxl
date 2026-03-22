import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    exclude: ["src/routeTree.gen.ts"],
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes/",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    viteReact(),
  ],
  build: {
    rolldownOptions: {
      external: ["@effect/platform-bun"],
    },
  },
  optimizeDeps: {
    exclude: ["@effect/platform-bun"],
  },
  ssr: {
    external: ["@effect/platform-bun"],
  },
});

export default config;
