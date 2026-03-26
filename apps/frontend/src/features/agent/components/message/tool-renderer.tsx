import {
  RiFileTextLine,
  RiFileAddLine,
  RiFileEditLine,
  RiTerminalBoxLine,
  RiWrenchLine,
} from "@remixicon/react";
import { TaskItem, TaskItemFile } from "@/components/ai-elements/task";
import type { ToolCallFromBlock } from "./message-types";
import { getPathFromParams, truncate } from "./message-utils";

export function getToolIcon(name: string) {
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
      return <RiWrenchLine className="size-4" />;
  }
}

interface ToolCallItemProps {
  tool: ToolCallFromBlock;
}

export function ToolCallItem({ tool }: ToolCallItemProps) {
  const params = tool.params as Record<string, unknown> | undefined;
  let content: React.ReactNode;

  switch (tool.name) {
    case "read":
    case "write":
    case "edit":
      content = (
        <span className="inline-flex items-center gap-1.5">
          <span className="capitalize">{tool.name}</span>
          <TaskItemFile>
            {getToolIcon(tool.name)}
            <span>{truncate(getPathFromParams(params ?? {}), 40)}</span>
          </TaskItemFile>
        </span>
      );
      break;
    case "bash":
      content = (
        <span className="inline-flex items-center gap-1.5">
          <span>Run</span>
          <TaskItemFile>
            {getToolIcon(tool.name)}
            <span>{truncate((params?.command as string) ?? "", 40)}</span>
          </TaskItemFile>
        </span>
      );
      break;
    default:
      content = <span>{tool.name}</span>;
  }

  return <TaskItem className="flex items-center gap-2 py-0.5">{content}</TaskItem>;
}

interface ToolCallsGroupProps {
  calls: ToolCallFromBlock[];
}

export function ToolCallsGroup({ calls }: ToolCallsGroupProps) {
  const hasRunning = calls.some((c) => c.status === "running");
  const completedCount = calls.filter((c) => c.status === "complete").length;
  const errorCount = calls.filter((c) => c.status === "error").length;

  let status: "pending" | "active" | "complete" = "complete";
  if (hasRunning) status = "active";
  else if (errorCount > 0 && completedCount === 0) status = "pending";

  let label: string;
  if (hasRunning) {
    label = `Running ${calls.length === 1 ? "tool" : "tools"}...`;
  } else if (errorCount > 0) {
    label = `${completedCount} completed, ${errorCount} failed`;
  } else {
    label = `${calls.length} tool${calls.length > 1 ? "s" : ""}`;
  }

  return { label, status, calls };
}
