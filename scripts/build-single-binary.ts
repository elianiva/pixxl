#!/usr/bin/env bun
/**
 * Build script to compile pixxl into a single binary using Bun's --compile.
 *
 * This embeds the frontend assets directly into the binary using --embed.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const FRONTEND_DIST = path.join(ROOT, "apps/frontend/dist");
const BACKEND_ENTRY = path.join(ROOT, "apps/backend/src/main.ts");
const OUTPUT_DIR = path.join(ROOT, "bin");
const OUTPUT_BINARY = path.join(OUTPUT_DIR, "pixxl");

async function main() {
  console.log("🔨 Building single pixxl binary with Bun --compile...\n");

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

  // Get all asset files for embedding
  const assetFiles: string[] = [];
  function collectFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else {
        assetFiles.push(fullPath);
      }
    }
  }
  collectFiles(FRONTEND_DIST);

  console.log(`📦 Embedding ${assetFiles.length} asset files...`);

  // Compile to single binary with embedded assets
  console.log("\n🔨 Compiling to single binary (this may take a moment)...");

  // Build args: bun build <entry> --compile --embed <file1> --embed <file2> ... --outfile <output>
  const compileArgs = [
    "build",
    BACKEND_ENTRY,
    "--compile",
    "--target", "bun",
    ...assetFiles.flatMap(f => ["--embed", f]),
    "--outfile", OUTPUT_BINARY,
  ];

  console.log("   Command: bun", compileArgs.map(a => a.includes(" ") ? `"${a}"` : a).join(" ").substring(0, 100) + "...");

  const proc = Bun.spawn({
    cmd: ["bun", ...compileArgs],
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error("\n❌ Compilation failed");
    process.exit(1);
  }

  // Make binary executable
  fs.chmodSync(OUTPUT_BINARY, 0o755);

  const stats = fs.statSync(OUTPUT_BINARY);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ Single binary built successfully!`);
  console.log(`   Path: ${OUTPUT_BINARY}`);
  console.log(`   Size: ${sizeMB} MB`);
  console.log(`\n   Usage:`);
  console.log(`     ${OUTPUT_BINARY}`);
  console.log(`\n   Or install to PATH:`);
  console.log(`     cp ${OUTPUT_BINARY} /usr/local/bin/`);
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
