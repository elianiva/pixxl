import { memo } from "react";
import { cn } from "@/lib/utils";

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
  const statusColors = {
    running: "border-primary/50 bg-primary/5",
    complete: "border-green-500/50 bg-green-500/5",
    error: "border-destructive/50 bg-destructive/5",
  };

  return (
    <div
      className={cn("rounded-md border p-2 text-xs transition-colors", statusColors[tool.status])}
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
      {tool.params && Object.keys(tool.params as object).length > 0 && (
        <div className="mt-1.5 text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
            params
          </span>
          <pre className="mt-0.5 overflow-x-auto rounded bg-muted/50 p-1">
            {JSON.stringify(tool.params, null, 2)}
          </pre>
        </div>
      )}

      {/* Tool output */}
      {tool.output && (
        <div className="mt-1.5 text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
            output
          </span>
          <pre className="mt-0.5 overflow-x-auto rounded bg-muted/50 p-1">
            {tool.output.length > 500 ? `${tool.output.slice(0, 500)}...` : tool.output}
          </pre>
        </div>
      )}

      {/* Tool error */}
      {tool.error && (
        <div className="mt-1.5 text-destructive">
          <span className="text-[10px] uppercase tracking-wide text-destructive/50">error</span>
          <pre className="mt-0.5 overflow-x-auto rounded bg-destructive/10 p-1">{tool.error}</pre>
        </div>
      )}
    </div>
  );
});
