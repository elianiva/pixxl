import type { PiSessionEntry } from "@pixxl/shared";
import { MessageResponse } from "@/components/ai-elements/message";
import { ThinkingRenderer } from "./thinking";
import { ToolCallRenderer } from "./tools";
import { type ContentBlock, type ToolCallBlockType, getToolResult } from "./types";

interface AssistantMessageEntryProps {
  entry: PiSessionEntry & { type: "message" };
  isStreaming: boolean;
  allEntries: readonly PiSessionEntry[];
}

export function AssistantMessageEntry({
  entry,
  isStreaming,
  allEntries,
}: AssistantMessageEntryProps) {
  const msg = entry.message as {
    role?: string;
    content?: unknown;
    thinking?: string;
    stopReason?: string;
    errorMessage?: string;
  };

  const content = msg.content;
  const hasSeparateThinking = msg.thinking && msg.thinking.trim() !== "";

  // Parse content blocks
  const blocks: ContentBlock[] =
    Array.isArray(content) && content.every((c) => c && typeof c === "object" && "type" in c)
      ? (content as ContentBlock[])
      : [];
  const hasThinkingInBlocks = blocks.some((b) => b.type === "thinking");

  // Count tool calls for conditional rendering
  const toolCallCount = blocks.filter((b): b is ToolCallBlockType => b.type === "toolCall").length;

  // Build ordered content
  const orderedElements: React.ReactNode[] = [];
  let textContent = "";

  for (const block of blocks) {
    switch (block.type) {
      case "text":
        textContent += block.text;
        break;
      case "thinking":
        orderedElements.push(
          <ThinkingRenderer
            key={`think-${orderedElements.length}`}
            thinking={block.thinking}
            isStreaming={isStreaming}
          />,
        );
        break;
      case "toolCall": {
        const result = getToolResult(allEntries, block.id);
        orderedElements.push(
          <ToolCallRenderer
            key={`tool-${block.id}`}
            toolCall={block}
            isStreaming={isStreaming}
            result={result}
            toolCount={toolCallCount}
          />,
        );
        break;
      }
    }
  }

  // If no blocks but has string content
  if (blocks.length === 0 && typeof content === "string") {
    textContent = content;
  }

  return (
    <div className="w-full px-0 py-1">
      {/* Separate thinking from persisted message */}
      {hasSeparateThinking && !hasThinkingInBlocks && (
        <ThinkingRenderer thinking={msg.thinking!} isStreaming={isStreaming} />
      )}

      {/* Ordered content blocks */}
      {orderedElements}

      {/* Text content with smooth streaming */}
      {textContent && (
        <div className="leading-tight">
          <MessageResponse mode={isStreaming ? "streaming" : "static"} isAnimating={isStreaming}>
            {textContent}
          </MessageResponse>
        </div>
      )}

      {/* Empty streaming placeholder */}
      {!textContent && isStreaming && orderedElements.length === 0 && (
        <div className="leading-tight">
          <MessageResponse mode="streaming" isAnimating />
        </div>
      )}

      {/* Error state */}
      {msg.stopReason === "error" && msg.errorMessage && (
        <div className="mx-4 mt-3 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <strong>Error:</strong> {msg.errorMessage}
        </div>
      )}
    </div>
  );
}
