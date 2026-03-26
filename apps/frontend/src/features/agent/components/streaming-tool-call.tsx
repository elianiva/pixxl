"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { TaskContent, TaskItem, TaskItemFile, Task } from "@/components/ai-elements/task";
import { Loader2Icon } from "lucide-react";
import { RiFileTextLine, RiFileAddLine, RiFileEditLine, RiTerminalBoxLine } from "@remixicon/react";

interface StreamingToolCallProps {
  tool: {
    id: string;
    name: string;
    params: unknown;
    status: "running" | "complete" | "error";
    output?: string;
    error?: string;
  };
}

function getToolIcon(name: string) {
  switch (name) {
    case "read":
      return <RiFileTextLine className="size-4" />;
    case "write":
      return <RiFileAddLine className="size-4" />;
    case "edit":
      return <RiFileEditLine className="size-4" />;
    case "bash":
      return <RiTerminalBoxLine className="size-4" />;
    default:
      return null;
  }
}

function getToolDescription(tool: StreamingToolCallProps["tool"]): React.ReactNode {
  const params = tool.params as Record<string, unknown> | undefined;
  const name = tool.name;

  switch (name) {
    case "read": {
      const path = (params?.path as string) ?? "unknown file";
      return (
        <span className="inline-flex items-center gap-1">
          Read
          <TaskItemFile>
            {getToolIcon(name)} <span>{path}</span>
          </TaskItemFile>
        </span>
      );
    }
    case "write": {
      const path = (params?.path as string) ?? "unknown file";
      return (
        <span className="inline-flex items-center gap-1">
          Write
          <TaskItemFile>
            {getToolIcon(name)} <span>{path}</span>
          </TaskItemFile>
        </span>
      );
    }
    case "edit": {
      const path = (params?.path as string) ?? "unknown file";
      return (
        <span className="inline-flex items-center gap-1">
          Edit
          <TaskItemFile>
            {getToolIcon(name)} <span>{path}</span>
          </TaskItemFile>
        </span>
      );
    }
    case "bash": {
      const command = (params?.command as string) ?? (params?.cmd as string) ?? "...";
      const truncated = command.length > 40 ? command.slice(0, 40) + "..." : command;
      return (
        <span className="inline-flex items-center gap-1">
          Run <code className="text-xs bg-muted px-1 py-0.5 rounded">{truncated}</code>
        </span>
      );
    }
    default: {
      const toolName = name.charAt(0).toUpperCase() + name.slice(1);
      return <span>{toolName}</span>;
    }
  }
}

export const StreamingToolCall = memo(function StreamingToolCall({ tool }: StreamingToolCallProps) {
  const isRunning = tool.status === "running";

  return (
    <div className={cn("flex items-center gap-2 py-0.5", isRunning && "text-primary")}>
      {isRunning ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : tool.status === "complete" ? (
        <svg
          className="size-3.5 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="size-3.5 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span className="text-sm">{getToolDescription(tool)}</span>
    </div>
  );
});

interface StreamingToolCallGroupProps {
  tools: Array<{
    id: string;
    name: string;
    params: unknown;
    status: "running" | "complete" | "error";
    output?: string;
    error?: string;
  }>;
}

export const StreamingToolCallGroup = memo(function StreamingToolCallGroup({
  tools,
}: StreamingToolCallGroupProps) {
  if (tools.length === 0) return null;

  return (
    <div className="mb-4">
      <Task>
        <TaskContent>
          {tools.map((tool) => (
            <TaskItem key={tool.id}>
              <StreamingToolCall tool={tool} />
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    </div>
  );
});
