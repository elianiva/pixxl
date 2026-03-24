import { RiFileEditLine } from "@remixicon/react";
import { CodeBlock } from "./code-block";

interface EditToolProps {
  path: string;
  oldString?: string;
  newString?: string;
  status: "running" | "complete" | "error";
}

interface DiffLine {
  type: "context" | "remove" | "add";
  content: string;
}

function parseEdit(oldString: string, newString: string): DiffLine[] {
  const lines: DiffLine[] = [];

  // Split into lines
  const oldLines = oldString.split("\n");
  const newLines = newString.split("\n");

  // Simple line-by-line diff
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      // Addition
      lines.push({ type: "add", content: newLine ?? "" });
    } else if (newLine === undefined) {
      // Removal
      lines.push({ type: "remove", content: oldLine });
    } else if (oldLine === newLine) {
      // Context
      lines.push({ type: "context", content: oldLine });
    } else {
      // Changed line - show remove then add
      lines.push({ type: "remove", content: oldLine });
      lines.push({ type: "add", content: newLine });
    }
  }

  return lines;
}

function formatDiff(diff: DiffLine[]): string {
  return diff
    .map((line) => {
      const prefix = line.type === "remove" ? "-" : line.type === "add" ? "+" : " ";
      return `${prefix} ${line.content}`;
    })
    .join("\n");
}

export function EditToolDisplay({ path, oldString, newString, status }: EditToolProps) {
  const diff =
    oldString !== undefined && newString !== undefined ? parseEdit(oldString, newString) : [];

  return (
    <div className="rounded-md border border-yellow-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
        <RiFileEditLine className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium truncate">{path}</span>
        <span className="text-xs text-yellow-600 ml-auto">edited</span>
      </div>

      {/* Diff content */}
      {status === "running" ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <span className="text-sm animate-pulse">Applying edit...</span>
        </div>
      ) : diff.length > 0 ? (
        <CodeBlock code={formatDiff(diff)} language="diff" />
      ) : (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <span className="text-sm">No diff available</span>
        </div>
      )}
    </div>
  );
}
