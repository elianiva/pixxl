import { memo, useCallback, useMemo } from "react";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFileCopyLine,
  RiGitBranchLine,
} from "@remixicon/react";
import { MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/components/ai-elements/task";
import { Tool, ToolHeader, ToolContent, ToolInput } from "@/components/ai-elements/tool";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  RiFileTextLine,
  RiFileAddLine,
  RiFileEditLine,
  RiTerminalBoxLine,
  RiLoader2Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import type { MessageBlock } from "@/features/agent/hooks";

import type { AgentMessageContentProps, ToolCallFromBlock } from "./message-types";

// Builtin tools that use Task component
const BUILTIN_TOOLS = ["read", "write", "edit", "bash"];

function getBuiltinToolIcon(name: string) {
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

interface BlockRendererProps {
  block: MessageBlock | ToolCallFromBlock;
  toolCalls?: ToolCallFromBlock[];
}

// Render thinking/reasoning blocks
function ThinkingBlock({ block }: { block: { type: "thinking"; thinking: string } }) {
  return (
    <Reasoning defaultOpen={false} className="mb-4">
      <ReasoningTrigger />
      <ReasoningContent>{block.thinking}</ReasoningContent>
    </Reasoning>
  );
}

// Render builtin tools (read, write, edit, bash) using Task component
function BuiltinToolBlock({ tool }: { tool: ToolCallFromBlock }) {
  const params = tool.params as Record<string, unknown> | undefined;
  const isRunning = tool.status === "running";

  let content: React.ReactNode;
  let title: string;

  switch (tool.name) {
    case "read":
    case "write":
    case "edit": {
      const path = getPathFromParams(params ?? {});
      title = `${tool.name} ${path}`;
      content = (
        <span className="inline-flex items-center gap-1.5">
          <span className="capitalize">{tool.name}</span>
          <TaskItemFile>
            {getBuiltinToolIcon(tool.name)}
            <span>{path}</span>
          </TaskItemFile>
        </span>
      );
      break;
    }
    case "bash": {
      const command = (params?.command as string) ?? (params?.cmd as string) ?? "";
      title = `bash ${truncate(command, 20)}`;
      content = (
        <span className="inline-flex items-center gap-1.5">
          <span>Run</span>
          <TaskItemFile>
            {getBuiltinToolIcon(tool.name)}
            <span>{truncate(command, 30)}</span>
          </TaskItemFile>
        </span>
      );
      break;
    }
    default: {
      title = tool.name;
      content = <span>{tool.name}</span>;
    }
  }

  const statusIcon = isRunning ? (
    <RiLoader2Line className="size-3.5 animate-spin text-primary" />
  ) : tool.status === "complete" ? (
    <RiCheckboxCircleLine className="size-3.5 text-green-500" />
  ) : tool.status === "error" ? (
    <RiCloseCircleLine className="size-3.5 text-destructive" />
  ) : null;

  return (
    <Task defaultOpen className="mb-4">
      <TaskTrigger title={title}>
        <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
          {statusIcon}
          <span className="text-sm">{title}</span>
        </div>
      </TaskTrigger>
      <TaskContent>
        <Collapsible>
          <CollapsibleTrigger className="cursor-pointer">
            <TaskItem
              className={cn("flex items-center gap-2 py-0.5", isRunning && "text-foreground")}
            >
              {content}
            </TaskItem>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {tool.output && (
              <div className="mt-2">
                <CodeBlock code={tool.output} language="markdown" contentClassName="text-xs" />
              </div>
            )}
            {tool.error && (
              <div className="mt-2 bg-destructive/10 p-2 text-xs text-destructive">
                {tool.error}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </TaskContent>
    </Task>
  );
}

// Render custom tools (MCP, etc) using Tool component
function CustomToolBlock({ tool }: { tool: ToolCallFromBlock }) {
  const isRunning = tool.status === "running";
  const state = isRunning
    ? "input-available"
    : tool.status === "complete"
      ? "output-available"
      : tool.status === "error"
        ? "output-error"
        : "input-streaming";

  return (
    <Tool className="mb-4" defaultOpen>
      <ToolHeader type="dynamic-tool" state={state} toolName={tool.name} />
      <ToolContent>
        <ToolInput input={tool.params} />
        {tool.output && (
          <div className="space-y-2">
            <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Result
            </h4>
            <CodeBlock
              code={
                typeof tool.output === "string" ? tool.output : JSON.stringify(tool.output, null, 2)
              }
              language={typeof tool.output === "string" ? "markdown" : "json"}
              className="text-xs"
            />
          </div>
        )}
        {tool.error && (
          <div className="space-y-2">
            <h4 className="font-medium text-destructive text-xs uppercase tracking-wide">Error</h4>
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {tool.error}
            </div>
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}

// Main block renderer component
function BlockRenderer({ block, toolCalls }: BlockRendererProps) {
  // Handle MessageBlock types from hooks
  if ("type" in block) {
    switch (block.type) {
      case "thinking":
        return <ThinkingBlock block={block} />;

      case "toolCall": {
        // Look up merged tool call data from message.toolCalls (has status/output/error)
        const mergedTool = toolCalls?.find((t) => t.id === block.id);
        // Convert MessageBlock toolCall to ToolCallFromBlock format
        const tool: ToolCallFromBlock = {
          id: block.id,
          name: block.name,
          params: block.arguments,
          status: mergedTool?.status ?? "running",
          output: mergedTool?.output,
          error: mergedTool?.error,
        };
        if (BUILTIN_TOOLS.includes(tool.name)) {
          return <BuiltinToolBlock tool={tool} />;
        }
        return <CustomToolBlock tool={tool} />;
      }

      case "text":
        // Text blocks are rendered as final content, not here
        return null;
    }
  }

  // Handle ToolCallFromBlock directly (from streaming state or already merged)
  const tool = block as ToolCallFromBlock;
  if (BUILTIN_TOOLS.includes(tool.name)) {
    return <BuiltinToolBlock tool={tool} />;
  }
  return <CustomToolBlock tool={tool} />;
}

export const MessageContent = memo(function MessageContent({
  message,
  onFork,
}: AgentMessageContentProps) {
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(message.content);
  }, [message.content]);

  const handleFork = useCallback(() => {
    onFork?.(message.content);
  }, [message.content, onFork]);

  // Extract blocks and final text
  const { renderBlocks, finalText } = useMemo(() => {
    const blocks: (MessageBlock | ToolCallFromBlock)[] = [];
    let textContent = "";

    if (message.blocks) {
      for (const block of message.blocks) {
        if (block.type === "text") {
          textContent = block.text;
        } else {
          blocks.push(block);
        }
      }
    }

    // If no text block found but we have content, use message.content as fallback
    if (!textContent && message.content) {
      textContent = message.content;
    }

    // Also include streaming tool calls if present
    if (message.toolCalls) {
      for (const tool of message.toolCalls) {
        // Only add if not already in blocks
        const exists = blocks.some((b) => "id" in b && (b as ToolCallFromBlock).id === tool.id);
        if (!exists) {
          blocks.push(tool);
        }
      }
    }

    return { renderBlocks: blocks, finalText: textContent };
  }, [message.blocks, message.content, message.toolCalls]);

  // Show streaming reasoning if active
  const hasStreamingContent = message.isStreaming && (message.reasoning || renderBlocks.length > 0);

  return (
    <div className="max-w-none">
      {/* Render individual blocks */}
      {renderBlocks.map((block, index) => {
        const key = "id" in block ? (block as ToolCallFromBlock).id : `block-${index}`;
        return <BlockRenderer key={key} block={block} toolCalls={message.toolCalls} />;
      })}

      {/* Streaming reasoning placeholder */}
      {hasStreamingContent && message.reasoning && (
        <Reasoning isStreaming defaultOpen className="mb-4">
          <ReasoningTrigger />
          <ReasoningContent>{message.reasoning}</ReasoningContent>
        </Reasoning>
      )}

      {/* Final text content */}
      {finalText && (
        <div className="leading-tight">
          <MessageResponse
            mode={message.isStreaming ? "streaming" : "static"}
            isAnimating={message.isStreaming}
          >
            {finalText}
          </MessageResponse>
        </div>
      )}

      {/* Empty streaming placeholder */}
      {!finalText && message.isStreaming && renderBlocks.length === 0 && (
        <div className="leading-tight">
          <MessageResponse mode="streaming" isAnimating>
            {""}
          </MessageResponse>
        </div>
      )}

      {/* Actions for assistant messages */}
      {!message.isStreaming && message.role === "assistant" && (
        <MessageActions className="mt-2 opacity-20 transition-opacity group-hover:opacity-100">
          <MessageAction label="Copy" tooltip="Copy to clipboard" onClick={handleCopy}>
            <RiFileCopyLine className="size-4" />
          </MessageAction>
          {onFork && (
            <MessageAction label="Fork" tooltip="Fork this response" onClick={handleFork}>
              <RiGitBranchLine className="size-4" />
            </MessageAction>
          )}
        </MessageActions>
      )}
    </div>
  );
});
