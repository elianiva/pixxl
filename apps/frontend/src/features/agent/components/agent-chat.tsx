import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { rpc } from "@/lib/rpc";
import { Button } from "@/components/ui/button";
import { AgentMessageContent } from "./agent-message-content";
import { ChatInput } from "./chat-input";
import { useAgentActions, useMessages } from "../hooks";

interface AgentChatProps {
  projectId: string;
  agentId: string;
}

export function AgentChat({ projectId, agentId }: AgentChatProps) {
  const messages = useMessages(agentId);
  console.log({ messages });
  const { sendPrompt } = useAgentActions(projectId);
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Fetch runtime state for queued messages
  const { data: runtimeState } = useQuery({
    queryKey: ["agent-runtime", projectId, agentId],
    queryFn: () => rpc.agent.getAgentRuntime({ projectId, agentId }),
    refetchInterval: 1000, // Poll for queue updates while streaming
  });

  const queuedMessages = [
    ...(runtimeState?.queuedSteering ?? []).map((text: string) => ({
      text,
      type: "steer" as const,
    })),
    ...(runtimeState?.queuedFollowUp ?? []).map((text: string) => ({
      text,
      type: "followUp" as const,
    })),
  ];

  const handleSubmit = useCallback(
    (text: string) => {
      void sendPrompt(text, "immediate");
      setIsStreaming(true);
    },
    [sendPrompt],
  );

  const handleQueueClick = useCallback(
    (message: { text: string; type: "steer" | "followUp" }) => {
      void sendPrompt(message.text, message.type);
      setIsStreaming(true);
    },
    [sendPrompt],
  );

  const handleScroll = useCallback(() => {
    const container = conversationRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsScrollButtonVisible(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Conversation area */}
      <div
        ref={conversationRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <svg
                className="size-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
            </div>
            <h3 className="mb-1 font-medium text-foreground">Start a conversation</h3>
            <p className="max-w-xs text-xs text-muted-foreground">
              Ask questions, get help with code, or explore your project with AI assistance.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "group flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {message.role === "assistant" ? (
                    <AgentMessageContent message={message} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {isScrollButtonVisible && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-32 right-4 z-10 size-8 rounded-full shadow-md"
          onClick={scrollToBottom}
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </Button>
      )}

      {/* Prompt input */}
      <ChatInput
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
        queuedMessages={queuedMessages}
        onQueueClick={handleQueueClick}
        placeholder="Ask anything..."
      />
    </div>
  );
}
