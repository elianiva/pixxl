import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RiAddLine, RiArrowUpLine, RiStopLine } from "@remixicon/react";
import { ModelSelector, MODELS, type ModelOption } from "./model-selector";
import { ThinkingLevelSelector, type ThinkingLevel } from "./thinking-level-selector";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  onAbort?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  onAbort,
  isStreaming = false,
  disabled = false,
  placeholder = "Ask anything...",
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

  return (
    <div className="mx-auto w-3xl border bg-background">
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
