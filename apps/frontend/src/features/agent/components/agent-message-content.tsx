import { memo } from "react";
import { cn } from "@/lib/utils";
import { ToolCallDisplay } from "./tool-call-display";

interface AgentMessageContentProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
    reasoning?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      params: unknown;
      status: "running" | "complete" | "error";
      output?: string;
      error?: string;
    }>;
  };
}

export const AgentMessageContent = memo(function AgentMessageContent({
  message,
}: AgentMessageContentProps) {
  return (
    <div className="prose prose-xs dark:prose-invert max-w-none">
      {/* Reasoning block */}
      {message.reasoning && (
        <div className="mb-2 rounded-md border border-muted bg-muted/50 p-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground/70">
            <svg
              className="size-3 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            Thinking
          </div>
          <div className="mt-1 whitespace-pre-wrap">{message.reasoning}</div>
        </div>
      )}

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mb-2 space-y-2">
          {message.toolCalls.map((tool) => (
            <ToolCallDisplay key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {/* Main content with streaming indicator */}
      <div
        className={cn(
          "whitespace-pre-wrap",
          message.isStreaming &&
            "after:content-[▊] after:animate-pulse after:text-muted-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
});
