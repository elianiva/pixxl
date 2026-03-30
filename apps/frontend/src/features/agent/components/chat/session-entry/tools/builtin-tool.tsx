import { RiLoader2Line, RiTerminalBoxLine, RiCloseCircleLine } from "@remixicon/react";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/components/ai-elements/task";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { extensionToLanguage } from "@/components/ai-elements/code-block-language-map";
import type { BundledLanguage } from "shiki";
import type { BuiltinTool } from "@pixxl/shared";

interface BuiltinToolTaskProps {
  tool: BuiltinTool;
  isStreaming: boolean;
  result?: { output?: string; error?: string; isError: boolean };
  toolCount: number;
}

// Render optional parameters as badges
function ParamBadge({ name, value }: { name: string; value?: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
      {name}
      {value !== undefined && (
        <>
          =<span className="text-foreground font-medium">{value}</span>
        </>
      )}
    </span>
  );
}

function getLanguageFromPath(path: string): BundledLanguage {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return "markdown";
  return extensionToLanguage[ext] ?? "markdown";
}

export function BuiltinToolTask({ tool, isStreaming, result, toolCount }: BuiltinToolTaskProps) {
  const hasResult = !!result;
  const isError = result?.isError ?? false;
  const isPending = !hasResult && isStreaming;
  const isComplete = hasResult && !isError;

  // Status icon - monochrome style
  const statusIcon = isPending ? (
    <RiLoader2Line className="size-3.5 animate-spin text-muted-foreground" />
  ) : isError ? (
    <RiCloseCircleLine className="size-3.5 text-muted-foreground" />
  ) : (
    <RiTerminalBoxLine className="size-3.5 text-muted-foreground" />
  );

  // Build label and params based on tool type
  const getLabel = (): string => {
    switch (tool.name) {
      case "bash": {
        const cmd = tool.arguments.command ?? tool.arguments.cmd ?? "";
        return cmd.slice(0, 40) + (cmd.length > 40 ? "..." : "");
      }
      case "grep":
        return `/${tool.arguments.pattern}/`;
      case "read":
        return tool.arguments.path;
      case "write":
        return tool.arguments.file;
      case "edit":
        return tool.arguments.target;
      default:
        return "unknown";
    }
  };

  // Collect optional params to display
  const extraParams: React.ReactNode[] = [];

  switch (tool.name) {
    case "read": {
      if (tool.arguments.offset !== undefined)
        extraParams.push(<ParamBadge key="offset" name="offset" value={tool.arguments.offset} />);
      if (tool.arguments.limit !== undefined)
        extraParams.push(<ParamBadge key="limit" name="limit" value={tool.arguments.limit} />);
      break;
    }
    case "bash": {
      if (tool.arguments.timeout !== undefined)
        extraParams.push(
          <ParamBadge key="timeout" name="timeout" value={`${tool.arguments.timeout}s`} />,
        );
      break;
    }
    case "grep": {
      if (tool.arguments.glob)
        extraParams.push(<ParamBadge key="glob" name="glob" value={tool.arguments.glob} />);
      if (tool.arguments.ignoreCase) extraParams.push(<ParamBadge key="ic" name="-i" />);
      if (tool.arguments.literal) extraParams.push(<ParamBadge key="fixed" name="-F" />);
      if (tool.arguments.context !== undefined)
        extraParams.push(<ParamBadge key="ctx" name="-C" value={tool.arguments.context} />);
      break;
    }
    case "edit": {
      if (tool.arguments.edits.length > 0)
        extraParams.push(
          <ParamBadge key="edits" name="edits" value={tool.arguments.edits.length} />,
        );
      break;
    }
    case "write": {
      extraParams.push(
        <ParamBadge key="len" name="length" value={`${tool.arguments.content.length}B`} />,
      );
      break;
    }
  }

  const labelContent = (
    <span className="inline-flex items-center gap-1.5">
      <span className="capitalize">{tool.name}</span>
      <TaskItemFile>
        <span>{getLabel()}</span>
      </TaskItemFile>
    </span>
  );

  const toolContent =
    extraParams.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {labelContent}
        {extraParams}
      </div>
    ) : (
      labelContent
    );

  const label = getLabel();

  // Get the file path for language detection
  const filePath =
    tool.name === "read"
      ? tool.arguments.path
      : tool.name === "write"
        ? tool.arguments.file
        : tool.name === "edit"
          ? tool.arguments.target
          : undefined;
  const outputLanguage = filePath ? getLanguageFromPath(filePath) : "markdown";

  // If only one tool, render directly without Task wrapper
  if (toolCount === 1) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {statusIcon}
          {toolContent}
        </div>
        {/* Output when available */}
        {result?.output && (
          <div className="mt-2 border-l-2 border-muted pl-4">
            <CodeBlock
              code={isComplete ? result.output : JSON.stringify(tool.arguments, null, 2)}
              language={outputLanguage}
              contentClassName="text-xs"
            />
          </div>
        )}
        {result?.error && (
          <div className="mt-2 border-l-2 border-destructive pl-4 text-xs text-destructive font-mono whitespace-pre-wrap">
            {result.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <Task defaultOpen className="mb-4">
      <TaskTrigger title={`${tool.name} ${label}`}>
        <div className="flex w-full items-center gap-2 text-muted-foreground text-sm hover:text-foreground">
          {statusIcon}
          {toolContent}
        </div>
      </TaskTrigger>
      <TaskContent>
        {result?.output ? (
          <div className="mt-2">
            {isComplete ? (
              <CodeBlock
                code={result.output}
                language={outputLanguage}
                contentClassName="text-xs"
              />
            ) : (
              <CodeBlock
                code={JSON.stringify(tool.arguments, null, 2)}
                language="json"
                contentClassName="text-xs"
              />
            )}
          </div>
        ) : (
          <TaskItem className="flex items-center gap-2 py-0.5 text-muted-foreground">
            {toolContent}
          </TaskItem>
        )}
        {result?.error && (
          <div className="mt-2 text-xs text-destructive font-mono whitespace-pre-wrap">
            {result.error}
          </div>
        )}
      </TaskContent>
    </Task>
  );
}
