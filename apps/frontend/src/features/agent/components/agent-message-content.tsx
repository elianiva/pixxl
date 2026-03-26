import { memo, useCallback } from "react";
import { MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { RiFileCopyLine, RiGitBranchLine } from "@remixicon/react";
import { ToolCallDisplay } from "./tool-call-display";
import { StreamingToolCallGroup } from "./streaming-tool-call";

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
  onFork?: (content: string) => void;
}

export const AgentMessageContent = memo(function AgentMessageContent({
  message,
  onFork,
}: AgentMessageContentProps) {
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(message.content);
  }, [message.content]);

  const handleFork = useCallback(() => {
    onFork?.(message.content);
  }, [message.content, onFork]);

  return (
    <div className="max-w-none">
      {/* Reasoning block with collapsible UI */}
      {message.reasoning && (
        <Reasoning isStreaming={message.isStreaming ?? false}>
          <ReasoningTrigger />
          <ReasoningContent>{message.reasoning}</ReasoningContent>
        </Reasoning>
      )}

      {/* Tool calls - use streaming style for streaming messages, detailed view for complete */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mb-2">
          {message.isStreaming ? (
            <StreamingToolCallGroup tools={message.toolCalls} />
          ) : (
            <div className="space-y-2">
              {message.toolCalls.map((tool) => (
                <ToolCallDisplay key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main content with MessageResponse (uses Streamdown with all plugins) */}
      <div className="leading-relaxed">
        <MessageResponse
          mode={message.isStreaming ? "streaming" : "static"}
          isAnimating={message.isStreaming}
        >
          {message.content}
        </MessageResponse>
      </div>

      {/* Actions - only show for completed assistant messages */}
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
