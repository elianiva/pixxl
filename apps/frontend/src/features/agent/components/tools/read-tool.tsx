import { RiFileTextLine } from "@remixicon/react";
import { CodeBlock } from "./code-block";

interface ReadToolProps {
  path: string;
  content?: string;
  status: "running" | "complete" | "error";
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  svg: "xml",
  sql: "sql",
  prisma: "prisma",
  env: "bash",
  gitignore: "bash",
  dockerfile: "dockerfile",
};

function detectLanguage(path: string): string {
  const filename = path.split("/").pop() ?? "";
  const lower = filename.toLowerCase();

  // Handle special filenames
  if (lower === "dockerfile") return "dockerfile";
  if (lower === "makefile") return "makefile";
  if (lower === ".gitignore" || lower === ".env.example") return "bash";
  if (lower === "prisma.schema") return "prisma";

  const ext = lower.split(".").pop() ?? "";
  return LANGUAGE_MAP[ext] ?? "text";
}

export function ReadToolDisplay({ path, content, status }: ReadToolProps) {
  const language = detectLanguage(path);

  return (
    <div className="rounded-md border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
        <RiFileTextLine className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{path}</span>
        <span className="text-xs text-muted-foreground ml-auto">read</span>
      </div>

      {/* Content */}
      {status === "running" ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <span className="text-sm animate-pulse">Reading file...</span>
        </div>
      ) : content ? (
        <CodeBlock code={content} language={language} />
      ) : (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <span className="text-sm">No content</span>
        </div>
      )}
    </div>
  );
}
