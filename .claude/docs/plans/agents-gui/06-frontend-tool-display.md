# Phase 6: Frontend Tool Display

## Goal
Display tool calls inline (bash output, file reads, edit diffs) using AI Elements code/terminal components.

## Tool Types to Support

| Tool | UI Component | Display |
|------|-------------|---------|
| `read` | CodeBlock | File content with path header |
| `write` | CodeBlock + diff highlight | New file content |
| `edit` | CodeBlock with unified diff | Before/after |
| `bash` | Terminal | Live streaming output |

## Components

### ToolCallDisplay Component

**File:** `apps/frontend/src/features/agents/components/ToolCallDisplay.tsx`

```typescript
import { Tool } from "ai-elements/tool";
import { CodeBlock } from "ai-elements/code-block";
import { Terminal, TerminalContent } from "ai-elements/terminal";
import { FileIcon, TerminalIcon, EditIcon } from "lucide-react";

interface ToolCallDisplayProps {
  tool: ToolCall;
}

export function ToolCallDisplay({ tool }: ToolCallDisplayProps) {
  return (
    <Tool
      name={tool.name}
      status={tool.status}
      className="my-2"
    >
      <ToolContent tool={tool} />
    </Tool>
  );
}

function ToolContent({ tool }: { tool: ToolCall }) {
  switch (tool.name) {
    case "read":
      return <ReadToolDisplay path={tool.params.path} content={tool.result} />;
    case "write":
      return <WriteToolDisplay path={tool.params.path} content={tool.result} />;
    case "edit":
      return <EditToolDisplay {...tool} />;
    case "bash":
      return <BashToolDisplay command={tool.params.command} output={tool.output} />;
    default:
      return <GenericToolDisplay tool={tool} />;
  }
}
```

### Read Tool Display

**File:** `apps/frontend/src/features/agents/components/tools/ReadTool.tsx`

```typescript
import { CodeBlock } from "ai-elements/code-block";

interface ReadToolProps {
  path: string;
  content: string;
}

export function ReadToolDisplay({ path, content }: ReadToolProps) {
  const language = detectLanguage(path);

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 border-b bg-muted px-3 py-2">
        <FileIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{path}</span>
        <span className="text-xs text-muted-foreground">read</span>
      </div>
      <CodeBlock
        code={content}
        language={language}
        showLineNumbers
        className="rounded-none border-0"
      />
    </div>
  );
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop();
  const langMap: Record<string, string> = {
    "ts": "typescript",
    "tsx": "tsx",
    "js": "javascript",
    "jsx": "jsx",
    "json": "json",
    "md": "markdown",
  };
  return langMap[ext || ""] || "text";
}
```

### Bash Tool Display

**File:** `apps/frontend/src/features/agents/components/tools/BashTool.tsx`

```typescript
import { Terminal, TerminalContent } from "ai-elements/terminal";
import { cn } from "@/lib/utils";

interface BashToolProps {
  command: string;
  output?: string;
  status: "running" | "complete" | "error";
}

export function BashToolDisplay({ command, output, status }: BashToolProps) {
  return (
    <div className="rounded-md border bg-black">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <TerminalIcon className="h-4 w-4 text-white/70" />
        <code className="text-sm text-white/90">$ {command}</code>
        {status === "running" && (
          <span className="ml-auto text-xs text-yellow-400">running...</span>
        )}
      </div>
      <Terminal isStreaming={status === "running"}>
        <TerminalContent className="max-h-64 text-sm">
          {output || <span className="text-white/50">No output yet...</span>}
        </TerminalContent>
      </Terminal>
      {status === "error" && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-3 py-2">
          <span className="text-xs text-red-400">Exit code: 1</span>
        </div>
      )}
    </div>
  );
}
```

### Edit Tool Display (Diff)

**File:** `apps/frontend/src/features/agents/components/tools/EditTool.tsx`

```typescript
import { CodeBlock } from "ai-elements/code-block";
import { parseEdit } from "./edit-parser"; // custom helper

interface EditToolProps {
  params: {
    path: string;
    old_string: string;
    new_string: string;
  };
  result: string;
}

export function EditToolDisplay({ params, result }: EditToolProps) {
  // Show unified diff view
  const diff = parseEdit(params.old_string, params.new_string);

  return (
    <div className="rounded-md border border-yellow-500/30">
      <div className="flex items-center gap-2 border-b border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
        <EditIcon className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium">{params.path}</span>
        <span className="text-xs text-yellow-600">edited</span>
      </div>
      <div className="p-0">
        {/* Show only the changed block with context */}
        <CodeBlock
          code={formatDiff(diff)}
          language="diff"
          className="rounded-none border-0 bg-[#1a1a1a]"
        />
      </div>
    </div>
  );
}

function formatDiff(diff: DiffLine[]): string {
  return diff
    .map((line) => `${line.type === "remove" ? "-" : line.type === "add" ? "+" : " "} ${line.content}`)
    .join("\n");
}
```

## Files to Create
- `apps/frontend/src/features/agents/components/ToolCallDisplay.tsx`
- `apps/frontend/src/features/agents/components/tools/ReadTool.tsx`
- `apps/frontend/src/features/agents/components/tools/WriteTool.tsx`
- `apps/frontend/src/features/agents/components/tools/EditTool.tsx`
- `apps/frontend/src/features/agents/components/tools/BashTool.tsx`
- `apps/frontend/src/features/agents/components/tools/index.ts`

## Files to Modify
- `apps/frontend/src/features/agents/components/AgentMessageContent.tsx` - integrate tools display

## Testing
- [ ] Read tool shows file content with syntax highlighting
- [ ] Bash tool streams output in real-time
- [ ] Edit tool shows unified diff
- [ ] Write tool shows new file content
- [ ] Status indicators (running/complete/error) work correctly

## Dependencies on Phase 5
- Uses AgentMessageContent from Phase 5
- Uses message.toolCall from store (Phase 4)

## Out of Scope
- No file tree integration (future phase)
- No inline file edits (future phase)
- No diff expansion (show full file vs just changed block)
