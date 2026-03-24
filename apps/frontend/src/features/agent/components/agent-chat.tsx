"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentMessageContent } from "./agent-message-content";
import { useAgentActions, useMessages, useAgentConnectionStatus } from "../hooks";
import { agentStore } from "../store";

export function AgentChat() {
  const messages = useMessages();
  const connectionStatus = useAgentConnectionStatus();
  const { sendPrompt } = useAgentActions();
  const [inputText, setInputText] = useState("");
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = connectionStatus === "streaming";

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || isStreaming) return;
    await sendPrompt(inputText);
    setInputText("");
    textareaRef.current?.focus();
  }, [inputText, isStreaming, sendPrompt]);

  const handleFormSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();
      await handleSubmit();
    },
    [handleSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
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
      <div className="border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={handleFormSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent..."
            className="min-h-[56px] max-h-[200px] resize-none pr-12"
            rows={1}
            disabled={isStreaming}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {/* Abort button */}
            {isStreaming && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => agentStore.state.connectionStatus === "streaming"}
                className="text-destructive hover:text-destructive"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </Button>
            )}
            {/* Submit button */}
            <Button
              type="submit"
              size="icon-xs"
              disabled={!inputText.trim() || isStreaming}
              className="size-7"
            >
              {isStreaming ? (
                <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    d="M12 19V5M5 12l7-7 7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              )}
            </Button>
          </div>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
