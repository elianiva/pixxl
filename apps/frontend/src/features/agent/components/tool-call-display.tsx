import { memo } from "react";
import { cn } from "@/lib/utils";
import { ReadToolDisplay } from "./tools/read-tool";
import { WriteToolDisplay } from "./tools/write-tool";
import { EditToolDisplay } from "./tools/edit-tool";
import { BashToolDisplay } from "./tools/bash-tool";

interface ToolCallDisplayProps {
  tool: {
    id: string;
    name: string;
    params: unknown;
    status: "running" | "complete" | "error";
    output?: string;
    error?: string;
  };
}

export const ToolCallDisplay = memo(function ToolCallDisplay({ tool }: ToolCallDisplayProps) {
  return (
    <div className="my-2">
      <ToolContent tool={tool} />
    </div>
  );
});

function ToolContent({ tool }: ToolCallDisplayProps) {
  const params = tool.params as Record<string, unknown> | undefined;

  switch (tool.name) {
    case "read":
      return (
        <ReadToolDisplay
          path={(params?.path as string) ?? "unknown"}
          content={tool.output}
          status={tool.status}
        />
      );

    case "write":
      return (
        <WriteToolDisplay
          path={(params?.path as string) ?? "unknown"}
          content={tool.output}
          status={tool.status}
        />
      );

    case "edit":
      return (
        <EditToolDisplay
          path={(params?.path as string) ?? "unknown"}
          oldString={params?.old_string as string}
          newString={params?.new_string as string}
          status={tool.status}
        />
      );

    case "bash":
      return (
        <BashToolDisplay
          command={(params?.command as string) ?? (params?.cmd as string) ?? ""}
          output={tool.output}
          error={tool.error}
          status={tool.status}
        />
      );

    default:
      return <GenericToolDisplay tool={tool} />;
  }
}

function GenericToolDisplay({ tool }: ToolCallDisplayProps) {
  const statusColors = {
    running: "border-primary/50 bg-primary/5",
    complete: "border-green-500/50 bg-green-500/5",
    error: "border-destructive/50 bg-destructive/5",
  };

  return (
    <div
      className={cn("rounded-md border p-3 text-xs transition-colors", statusColors[tool.status])}
    >
      <div className="flex items-center gap-2 font-medium">
        {/* Status indicator */}
        {tool.status === "running" && (
          <svg className="size-3 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {tool.status === "complete" && (
          <svg
            className="size-3 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        )}
        {tool.status === "error" && (
          <svg
            className="size-3 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        )}

        {/* Tool name */}
        <span className="text-foreground">{tool.name}</span>

        {/* Tool status label */}
        <span
          className={cn(
            "ml-auto text-[10px] uppercase tracking-wide",
            tool.status === "running" && "text-primary",
            tool.status === "complete" && "text-green-500",
            tool.status === "error" && "text-destructive",
          )}
        >
          {tool.status}
        </span>
      </div>

      {/* Tool params */}
      {(() => {
        const params = tool.params as Record<string, unknown> | undefined;
        if (!params || Object.keys(params).length === 0) return null;
        return (
          <div className="mt-2 text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
              params
            </span>
            <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2">
              {JSON.stringify(params, null, 2)}
            </pre>
          </div>
        );
      })()}

      {/* Tool output */}
      {tool.output && (
        <div className="mt-2 text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
            output
          </span>
          <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2">
            {tool.output.length > 1000
              ? `${tool.output.slice(0, 1000)}...\n\n[Output truncated]`
              : tool.output}
          </pre>
        </div>
      )}

      {/* Tool error */}
      {tool.error && (
        <div className="mt-2 text-destructive">
          <span className="text-[10px] uppercase tracking-wide text-destructive/50">error</span>
          <pre className="mt-1 overflow-x-auto rounded bg-destructive/10 p-2">{tool.error}</pre>
        </div>
      )}
    </div>
  );
}
