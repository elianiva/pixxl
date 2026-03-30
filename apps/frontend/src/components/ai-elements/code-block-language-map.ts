import type { BundledLanguage } from "shiki";

/**
 * Maps file extensions (without the leading dot) to Shiki BundledLanguage.
 * Covers common languages used in code workspaces.
 */
export const extensionToLanguage: Record<string, BundledLanguage> = {
  // JavaScript/TypeScript
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",

  // Web
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",

  // Python
  py: "python",
  pyw: "python",
  pyi: "python",

  // Rust
  rs: "rust",

  // Go
  go: "go",

  // C family
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  cs: "csharp",

  // Java/Kotlin
  java: "java",
  kt: "kotlin",
  kts: "kotlin",

  // Ruby
  rb: "ruby",
  erb: "ruby",

  // PHP
  php: "php",

  // Shell
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",

  // SQL
  sql: "sql",

  // Data/Config
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  csv: "csv",

  // Markdown
  md: "markdown",
  mdx: "markdown",

  // Others
  pyxl: "python",
  tf: "hcl",
  tfvars: "hcl",
  dockerfile: "dockerfile",
  makefile: "makefile",
  cmakelists: "cmake",
  lua: "lua",
  r: "r",
  swift: "swift",
  dart: "dart",
  vue: "vue",
  svelte: "svelte",
} as const;
