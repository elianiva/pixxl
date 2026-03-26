import { memo, useCallback } from "react";
import { RiFileCopyLine, RiGitBranchLine } from "@remixicon/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
} from "@/components/ai-elements/chain-of-thought";
import { MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";

import type { AgentMessageContentProps } from "./message-types";
import { stepsFromBlocks } from "./message-utils";
import { ChainSteps } from "./message-steps";

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

  // Build steps from blocks for proper interleaving
  // This gives us: thinking → tool → thinking → tool → text in correct order
  const steps = message.blocks ? stepsFromBlocks(message.blocks, message.isStreaming ?? false) : [];

  // All steps except final text response become CoT chain
  const chainSteps = steps.slice(0, -1);
  const finalStep = steps.at(-1);
  const finalContent = finalStep?.type === "text" ? finalStep.content : message.content;

  // Show CoT if we have chain steps OR if streaming (to show thinking placeholder)
  const hasChainContent = chainSteps.length > 0 || (message.isStreaming ?? false);

  return (
    <div className="max-w-none">
      {hasChainContent && (
        <ChainOfThought defaultOpen className="mb-4 bg-accent/20 border border-accent">
          <ChainOfThoughtHeader>
            {message.isStreaming ? "Processing..." : "Chain of Thought"}
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            <ChainSteps
              steps={chainSteps}
              isStreaming={message.isStreaming}
              streamingReasoning={message.reasoning}
            />
          </ChainOfThoughtContent>
        </ChainOfThought>
      )}

      <div className="leading-tight">
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
