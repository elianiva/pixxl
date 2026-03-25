import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RiAddLine, RiArrowUpLine, RiStopLine } from "@remixicon/react";
import { ModelSelector, MODELS, type ModelOption } from "./model-selector";
import { ThinkingLevelSelector, type ThinkingLevel } from "./thinking-level-selector";

interface QueuedMessage {
  text: string;
  type: "steer" | "followUp";
}

interface ChatInputProps {
  onSubmit: (text: string) => void;
  onAbort?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  queuedMessages?: QueuedMessage[];
  onQueueClick?: (message: QueuedMessage) => void;
}

export function ChatInput({
  onSubmit,
  onAbort,
  isStreaming = false,
  disabled = false,
  placeholder = "Ask anything...",
  queuedMessages = [],
  onQueueClick,
}: ChatInputProps) {
  const [inputText, setInputText] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("medium");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
    setInputText("");
    textareaRef.current?.focus();
  }, [inputText, isStreaming, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const steerCount = queuedMessages.filter((m) => m.type === "steer").length;
  const followUpCount = queuedMessages.filter((m) => m.type === "followUp").length;

  return (
    <div className="mx-auto w-3xl border bg-background">
      {/* Queued messages bar */}
      {queuedMessages.length > 0 && (
        <div className="border-b px-4 py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{queuedMessages.length} queued</span>
            <div className="flex items-center gap-1">
              {steerCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const msg = queuedMessages.find((m) => m.type === "steer");
                    if (msg) onQueueClick?.(msg);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-amber-700 hover:bg-amber-200"
                >
                  <span>steer</span>
                  <span className="font-medium">{steerCount}</span>
                </button>
              )}
              {followUpCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const msg = queuedMessages.find((m) => m.type === "followUp");
                    if (msg) onQueueClick?.(msg);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-blue-700 hover:bg-blue-200"
                >
                  <span>follow-up</span>
                  <span className="font-medium">{followUpCount}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="relative border-b">
        <Textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          className="min-h-25 resize-none border-0 bg-transparent px-4 pt-4 pb-14 text-sm shadow-none focus-visible:ring-0"
          rows={1}
        />

        {/* Bottom toolbar */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          {/* Left: Add media */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isStreaming}
            className="text-muted-foreground hover:text-foreground"
            title="Add media"
          >
            <RiAddLine className="size-4" />
          </Button>

          {/* Right: Send/Stop button */}
          <div className="flex items-center">
            {isStreaming && onAbort ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={onAbort}
                title="Stop generation"
              >
                <RiStopLine className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={handleSubmit}
                disabled={!inputText.trim() || isStreaming}
                title="Send message"
              >
                <RiArrowUpLine className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer with model/thinking selectors */}
      <div className="flex items-center gap-1 px-3 py-2 text-xs bg-mauve-100">
        <ModelSelector
          selectedModel={selectedModel}
          onSelect={setSelectedModel}
          disabled={disabled || isStreaming}
        />
        <ThinkingLevelSelector
          thinkingLevel={thinkingLevel}
          onSelect={setThinkingLevel}
          disabled={disabled || isStreaming}
        />
      </div>
    </div>
  );
}
