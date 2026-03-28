#!/usr/bin/env bun
/**
 * Build script to bundle pixxl for npm distribution.
 *
 * This creates:
 * 1. A bundled backend.js with all dependencies
 * 2. Static frontend assets in bin/dist/
 * 3. A lightweight entry script
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const FRONTEND_DIST = path.join(ROOT, "apps/frontend/dist");
const BACKEND_ENTRY = path.join(ROOT, "apps/backend/src/main.ts");
const OUTPUT_DIR = path.join(ROOT, "bin");

async function main() {
  console.log("🔨 Building pixxl for npm...\n");

  // Ensure frontend is built
  const indexExists = await Bun.file(path.join(FRONTEND_DIST, "index.html")).exists();
  if (!indexExists) {
    console.error("❌ Frontend dist not found. Run 'pnpm run build:frontend' first.");
    process.exit(1);
  }
  console.log("✓ Frontend dist ready");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Copy frontend assets
  console.log("\n📦 Copying frontend assets...");
  const assetsDir = path.join(OUTPUT_DIR, "dist");
  if (fs.existsSync(assetsDir)) {
    fs.rmSync(assetsDir, { recursive: true });
  }
  fs.cpSync(FRONTEND_DIST, assetsDir, { recursive: true });
  console.log("✓ Frontend assets copied");

  // Bundle the backend
  console.log("\n🔨 Bundling backend...");
  const bundledBackend = path.join(OUTPUT_DIR, "backend.js");

  const build = await Bun.build({
    entrypoints: [BACKEND_ENTRY],
    outdir: OUTPUT_DIR,
    target: "bun",
    format: "esm",
    naming: {
      entry: "backend.js",
    },
    external: [], // Bundle everything including node_modules
  });

  if (!build.success) {
    console.error("❌ Build failed:");
    for (const log of build.logs) {
      console.error(" ", log);
    }
    process.exit(1);
  }

  console.log("✓ Backend bundled");

  // Create entry script
  const entryScript = `#!/usr/bin/env bun
// pixxl CLI entry point
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.PIXXL_ASSETS_DIR = path.join(__dirname, "dist");

await import(path.join(__dirname, "backend.js"));
`;

  const entryPath = path.join(OUTPUT_DIR, "pixxl");
  fs.writeFileSync(entryPath, entryScript.trim());
  fs.chmodSync(entryPath, 0o755);

  // Get file sizes
  const entryStats = fs.statSync(entryPath);
  const backendStats = fs.statSync(bundledBackend);

  console.log(`\n✅ Build complete!`);
  console.log(`   Entry: ${entryPath} (${(entryStats.size / 1024).toFixed(2)} KB)`);
  console.log(`   Backend: ${bundledBackend} (${(backendStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Assets: ${assetsDir}`);
  console.log(`\n   Usage: bun ${entryPath}`);
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
