import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { StreamingIndicator } from "./streaming-indicator";
import type { MessageBlock } from "../../hooks";

interface Message {
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
  blocks?: MessageBlock[];
}

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onFork?: (content: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Merge consecutive assistant messages into a single message with interleaved steps.
 * This creates ONE Chain of Thought per agent turn, with thinking and tool use
 * appearing as steps within that single chain.
 *
 * Goal: Instead of multiple bubbles each with their own CoT:
 *   -- CoT 1
 *   - thinking
 *   - tool use
 *   -- CoT 2
 *   - thinking
 *   - tool use
 *
 * We want ONE bubble with ONE CoT:
 *   -- CoT
 *   - thinking (part 1)
 *   - tool use 1
 *   - thinking (part 2)
 *   - tool use 2
 *   - thinking (part 3)
 *   - final text response
 */
function mergeMessagesIntoSingleChain(messages: Message[]): Message[] {
  const result: Message[] = [];
  let currentAssistantGroup: Message[] = [];

  const flushAssistantGroup = () => {
    if (currentAssistantGroup.length === 0) return;

    if (currentAssistantGroup.length === 1) {
      // Single message - no merging needed
      result.push(currentAssistantGroup[0]);
    } else {
      // Multiple messages - merge into ONE message
      // Collect all content from all messages in order
      const mergedContent: string[] = [];
      const mergedToolCalls: NonNullable<Message["toolCalls"]> = [];
      const mergedBlocks: NonNullable<Message["blocks"]> = [];

      for (const msg of currentAssistantGroup) {
        // Add content if present
        if (msg.content) {
          mergedContent.push(msg.content);
        }
        // Add tool calls
        if (msg.toolCalls) {
          mergedToolCalls.push(...msg.toolCalls);
        }
        // Add blocks (thinking + tool calls in order)
        if (msg.blocks) {
          mergedBlocks.push(...msg.blocks);
        }
      }

      // The merged message uses the first message's ID
      // and combines everything into one interleaved chain
      result.push({
        id: currentAssistantGroup[0].id,
        role: "assistant",
        content: mergedContent.join(""),
        isStreaming: currentAssistantGroup.some((m) => m.isStreaming),
        toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : undefined,
        blocks: mergedBlocks.length > 0 ? mergedBlocks : undefined,
        // No separate reasoning - it's in the blocks as thinking steps
      });
    }

    currentAssistantGroup = [];
  };

  for (const message of messages) {
    if (message.role === "assistant") {
      currentAssistantGroup.push(message);
    } else {
      // User message - flush any pending assistant group first
      flushAssistantGroup();
      result.push(message);
    }
  }

  // Flush remaining assistant messages at the end
  flushAssistantGroup();

  return result;
}

export function MessageList({
  messages,
  isStreaming,
  onFork,
  scrollContainerRef,
}: MessageListProps) {
  const mergedMessages = mergeMessagesIntoSingleChain(messages);
  const lastScrollKeyRef = useRef<string | null>(null);

  // Track last message content to detect streaming updates
  const lastMessage = mergedMessages.at(-1);
  const scrollKey = lastMessage ? `${lastMessage.id}-${lastMessage.content.length}` : "empty";

  // Scroll to bottom on mount, new messages, or streaming content changes
  useEffect(() => {
    if (lastScrollKeyRef.current === scrollKey) return;
    lastScrollKeyRef.current = scrollKey;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Use setTimeout to ensure DOM has fully updated with new content
    const timeoutId = setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [scrollKey, scrollContainerRef]);

  return (
    <div className="space-y-4">
      {mergedMessages.map((message) => (
        <MessageBubble key={message.id} message={message} onFork={onFork} />
      ))}
      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
