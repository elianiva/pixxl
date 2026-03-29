#!/usr/bin/env bun
/**
 * Build script to compile pixxl into a single binary.
 *
 * Usage:
 *   bun scripts/build-binary.ts
 *
 * This creates:
 *   bin/pixxl - Single executable binary with embedded frontend assets
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const FRONTEND_DIST = path.join(ROOT, "apps/frontend/dist");
const BACKEND_ENTRY = path.join(ROOT, "apps/backend/src/main.ts");
const OUTPUT_DIR = path.join(ROOT, "bin");
const OUTPUT_BINARY = path.join(OUTPUT_DIR, "pixxl");

async function main() {
  console.log("🔨 Building pixxl single binary...\n");

  // Ensure frontend is built
  const indexExists = await Bun.file(path.join(FRONTEND_DIST, "index.html")).exists();
  if (!indexExists) {
    console.log("   Building frontend first...");
    const build = await Bun.spawn({
      cmd: ["bun", "run", "build:frontend"],
      cwd: ROOT,
      stdout: "inherit",
      stderr: "inherit",
    });
    const exit = await build.exited;
    if (exit !== 0) {
      console.error("❌ Frontend build failed");
      process.exit(1);
    }
  }
  console.log("✓ Frontend ready\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Collect all files from frontend dist to embed
  const filesToEmbed: string[] = [];
  function collectFiles(dir: string, relativeTo: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(relativeTo, fullPath);
      if (entry.isDirectory()) {
        collectFiles(fullPath, relativeTo);
      } else {
        filesToEmbed.push(relPath);
      }
    }
  }
  collectFiles(FRONTEND_DIST, ROOT);

  console.log(`📦 Embedding ${filesToEmbed.length} files...`);

  // Build args: bun build --compile --embed <file1> --embed <file2> ... --outfile <output> <entry>
  const compileArgs = [
    "build",
    "--compile",
    "--minify",
    "--sourcemap",
    ...filesToEmbed.flatMap((f) => ["--embed", f]),
    "--outfile",
    OUTPUT_BINARY,
    BACKEND_ENTRY,
  ];

  console.log("🔨 Compiling binary (this may take a moment)...\n");

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

  console.log(`\n✅ Binary built: ${OUTPUT_BINARY}`);
  console.log(`   Size: ${sizeMB} MB`);
  console.log(`\n   Run with: ${OUTPUT_BINARY}`);
  console.log(`   Or: bun ${OUTPUT_BINARY}`);
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
