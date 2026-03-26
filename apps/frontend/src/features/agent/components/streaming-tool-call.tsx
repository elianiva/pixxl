"use client";

import { memo } from "react";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/components/ai-elements/task";
import { cn } from "@/lib/utils";
import {
  RiFileTextLine,
  RiFileAddLine,
  RiFileEditLine,
  RiTerminalBoxLine,
  RiLoader2Line,
} from "@remixicon/react";

interface ToolCallItemProps {
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
      return <RiFileTextLine className="size-4 text-blue-500" />;
    case "write":
      return <RiFileAddLine className="size-4 text-green-500" />;
    case "edit":
      return <RiFileEditLine className="size-4 text-yellow-500" />;
    case "bash":
      return <RiTerminalBoxLine className="size-4 text-slate-500" />;
    default:
      return null;
  }
}

function getPathFromParams(params: Record<string, unknown>): string {
  const path = params.path as string | undefined;
  return path ?? "unknown";
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

const ToolCallItem = memo(function ToolCallItem({ tool }: ToolCallItemProps) {
  const params = tool.params as Record<string, unknown> | undefined;
  const isRunning = tool.status === "running";

  let content: React.ReactNode;

  switch (tool.name) {
    case "read":
    case "write":
    case "edit": {
      const path = getPathFromParams(params ?? {});
      content = (
        <span className="inline-flex items-center gap-1.5">
          <span className="capitalize">{tool.name}</span>
          <TaskItemFile>
            {getToolIcon(tool.name)}
            <span>{truncate(path, 30)}</span>
          </TaskItemFile>
        </span>
      );
      break;
    }
    case "bash": {
      const command = (params?.command as string) ?? (params?.cmd as string) ?? "";
      content = (
        <span className="inline-flex items-center gap-1.5">
          <span>Run</span>
          <TaskItemFile>
            {getToolIcon(tool.name)}
            <span>{truncate(command, 30)}</span>
          </TaskItemFile>
        </span>
      );
      break;
    }
    default: {
      content = <span>{tool.name}</span>;
    }
  }

  return (
    <TaskItem className={cn("flex items-center gap-2 py-0.5", isRunning && "text-foreground")}>
      {isRunning ? (
        <RiLoader2Line className="size-3.5 animate-spin text-primary" />
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
      {content}
    </TaskItem>
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

  const hasRunningTool = tools.some((t) => t.status === "running");
  const completedCount = tools.filter((t) => t.status === "complete").length;
  const errorCount = tools.filter((t) => t.status === "error").length;

  let title: string;
  if (hasRunningTool) {
    title = "Running tools...";
  } else if (errorCount > 0) {
    title = `${completedCount} completed, ${errorCount} failed`;
  } else {
    title = `${tools.length} tool${tools.length > 1 ? "s" : ""} completed`;
  }

  return (
    <div className="mb-4">
      <Task defaultOpen>
        <TaskTrigger title={title} />
        <TaskContent>
          {tools.map((tool) => (
            <ToolCallItem key={tool.id} tool={tool} />
          ))}
        </TaskContent>
      </Task>
    </div>
  );
});
