import { memo, useCallback } from "react";
import { RiFileCopyLine, RiGitBranchLine, RiBrainLine, RiWrenchLine } from "@remixicon/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";

import type { AgentMessageContentProps } from "./message-types";
import { stepsFromBlocks } from "./message-utils";
import { ChainSteps } from "./message-steps";
import { ToolCallItem } from "./tool-renderer";

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

  const steps = message.blocks ? stepsFromBlocks(message.blocks, message.isStreaming ?? false) : [];

  const chainSteps = steps.slice(0, -1);
  const finalStep = steps.at(-1);
  const finalContent = finalStep?.type === "text" ? finalStep.content : message.content;

  const hasChainContent =
    chainSteps.length > 0 ||
    message.reasoning ||
    (message.toolCalls && message.toolCalls.length > 0);

  return (
    <div className="max-w-none">
      {hasChainContent && (
        <ChainOfThought defaultOpen className="mb-4">
          <ChainOfThoughtHeader>
            {message.isStreaming ? "Processing..." : "Chain of Thought"}
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {message.reasoning && (
              <ChainOfThoughtStep
                icon={RiBrainLine}
                label={message.isStreaming ? "Thinking..." : "Thought"}
                status={message.isStreaming ? "active" : "complete"}
              >
                <div className="text-muted-foreground">
                  <MessageResponse mode="static">{message.reasoning}</MessageResponse>
                </div>
              </ChainOfThoughtStep>
            )}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ChainOfThoughtStep
                icon={RiWrenchLine}
                label={`${message.toolCalls.length} tool${message.toolCalls.length > 1 ? "s" : ""}`}
                status="complete"
              >
                <div className="space-y-1">
                  {message.toolCalls.map((tool) => (
                    <ToolCallItem key={tool.id} tool={tool} />
                  ))}
                </div>
              </ChainOfThoughtStep>
            )}
            {chainSteps.length > 0 && <ChainSteps steps={chainSteps} />}
          </ChainOfThoughtContent>
        </ChainOfThought>
      )}

      <div className="leading-relaxed">
        <MessageResponse
          mode={message.isStreaming ? "streaming" : "static"}
          isAnimating={message.isStreaming}
        >
          {finalContent}
        </MessageResponse>
      </div>

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
