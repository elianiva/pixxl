import { useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createTooltipHandle,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiDatabase2Line,
  RiSettings3Line,
  RiStopLine,
} from "@remixicon/react";
import type { PiUsageSchemaType } from "@pixxl/shared";
import { ModelSelector, type ModelOption } from "../settings/model-selector";
import { ThinkingLevelSelector, type ThinkingLevel } from "../settings/thinking-selector";
import { SessionSettingsDialog } from "../dialog/session-settings";
import { LOADING_MESSAGES } from "./input-whimsical";

const tooltipHandle = createTooltipHandle();

function pickRandomMessage(): string {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}

interface QueuedMessage {
  text: string;
  type: "steer" | "followUp";
}

export interface ChatSubmitOptions {
  model?: ModelOption;
  thinkingLevel?: ThinkingLevel;
}

export interface FileEditStats {
  additions: number;
  deletions: number;
}

interface ChatInputProps {
  onSubmit: (text: string, options: ChatSubmitOptions) => void;
  onAbort?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  queuedMessages?: QueuedMessage[];
  onQueueClick?: (message: QueuedMessage) => void;
  model: ModelOption | undefined;
  thinkingLevel: ThinkingLevel;
  onModelChange: (model: ModelOption) => void;
  onThinkingLevelChange: (level: ThinkingLevel) => void;
  usage?: PiUsageSchemaType;
  /** Context window size in tokens for progress bar calculation */
  contextWindow?: number;
  /** Project ID for session operations */
  projectId?: string;
  /** Agent ID for session operations */
  agentId?: string;
  /** File edit statistics to show in header */
  fileEditStats?: FileEditStats;
}

/** Format number compactly: 12500 -> 12.5k, 1_250_000 -> 1.2m */
function fmtCompact(n: number): string {
  if (n < 1_000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export function ChatInput({
  onSubmit,
  onAbort,
  isStreaming = false,
  disabled = false,
  placeholder = "Ask anything...",
  queuedMessages = [],
  onQueueClick,
  model,
  thinkingLevel,
  onModelChange,
  onThinkingLevelChange,
  usage,
  contextWindow = 0,
  projectId,
  agentId,
  fileEditStats,
}: ChatInputProps) {
  const [inputText, setInputText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useEffectEvent(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming || !model) return;
    setLoadingMessage(pickRandomMessage());
    onSubmit(trimmed, { model, thinkingLevel });
    setInputText("");
    textareaRef.current?.focus();
  });

  const handleKeyDown = useEffectEvent((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });

  const steerCount = queuedMessages.filter((m) => m.type === "steer").length;
  const followUpCount = queuedMessages.filter((m) => m.type === "followUp").length;

  return (
    <div className="mx-auto w-full max-w-3xl border bg-background">
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

      {/* Loading header - slides up from behind textbox */}
      <div
        className={`overflow-hidden bg-mauve-100 transition-all duration-300 ease-out ${
          isStreaming ||
          (fileEditStats && (fileEditStats.additions > 0 || fileEditStats.deletions > 0))
            ? "max-h-10 opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {/* 3x3 Braille-ish animated dots */}
            <svg className="size-4" viewBox="0 0 16 16" fill="none">
              {/* Row 1 */}
              <circle
                cx="3"
                cy="3"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "0ms" }}
              />
              <circle
                cx="8"
                cy="3"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <circle
                cx="13"
                cy="3"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
              {/* Row 2 */}
              <circle
                cx="3"
                cy="8"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "450ms" }}
              />
              <circle
                cx="8"
                cy="8"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "600ms" }}
              />
              <circle
                cx="13"
                cy="8"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "750ms" }}
              />
              {/* Row 3 */}
              <circle
                cx="3"
                cy="13"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "900ms" }}
              />
              <circle
                cx="8"
                cy="13"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "1050ms" }}
              />
              <circle
                cx="13"
                cy="13"
                r="1.5"
                className="fill-current animate-pulse"
                style={{ animationDelay: "1200ms" }}
              />
            </svg>
            <span className="font-medium">{loadingMessage}</span>
          </div>
          {/* File edit stats - always show if we have diffs */}
          {fileEditStats && (fileEditStats.additions > 0 || fileEditStats.deletions > 0) && (
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-emerald-600">+{fileEditStats.additions}</span>
              <span className="text-rose-600">-{fileEditStats.deletions}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative border-b">
        <Textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          className="min-h-25 resize-none border-0 bg-transparent px-4 pt-4 pb-14 text-sm! shadow-none focus-visible:ring-0"
          rows={1}
        />

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
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

      <div className="flex items-center gap-1 bg-mauve-100 px-3 py-2 text-xs">
        <ModelSelector
          selectedModel={model}
          onSelect={onModelChange}
          disabled={disabled || isStreaming}
        />
        <ThinkingLevelSelector
          thinkingLevel={thinkingLevel}
          onSelect={onThinkingLevelChange}
          disabled={disabled || isStreaming}
        />
        <div className="flex-1" />
        {usage && (
          <TooltipProvider delay={300}>
            <div className="flex items-center text-muted-foreground">
              {/* Context Window Progress - Radial */}
              <TooltipTrigger
                handle={tooltipHandle}
                render={
                  <div className="flex cursor-default items-center gap-1.5 px-1">
                    <svg className="size-4" viewBox="0 0 20 20">
                      {/* Background circle */}
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        className="text-mauve-300"
                        strokeWidth="3"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={
                          contextWindow > 0
                            ? `${(usage.totalTokens / contextWindow) * 50.27} 50.27`
                            : "0 50.27"
                        }
                        className={`transition-all ${
                          contextWindow > 0
                            ? usage.totalTokens / contextWindow > 0.9
                              ? "text-destructive"
                              : usage.totalTokens / contextWindow > 0.7
                                ? "text-amber-500"
                                : "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                        transform="rotate(-90 10 10)"
                      />
                    </svg>
                    <span className="tabular-nums text-muted-foreground">
                      {contextWindow > 0
                        ? `${Math.round((usage.totalTokens / contextWindow) * 100)}%/${fmtCompact(contextWindow)}`
                        : `${fmtCompact(usage.totalTokens)} tokens`}
                    </span>
                  </div>
                }
                payload={
                  contextWindow > 0
                    ? `Context window: ${usage.totalTokens.toLocaleString()} / ${contextWindow.toLocaleString()} tokens`
                    : `Total tokens: ${usage.totalTokens.toLocaleString()}`
                }
              />
              {/* Token Stats */}
              <TooltipTrigger
                handle={tooltipHandle}
                render={
                  <span className="flex cursor-default items-center gap-0.5 px-1">
                    <RiArrowUpLine className="size-3" />
                    {fmtCompact(usage.input)}
                  </span>
                }
                payload={`Input tokens: ${usage.input.toLocaleString()}`}
              />
              <TooltipTrigger
                handle={tooltipHandle}
                render={
                  <span className="flex cursor-default items-center gap-0.5 px-1">
                    <RiArrowDownLine className="size-3" />
                    {fmtCompact(usage.output)}
                  </span>
                }
                payload={`Output tokens: ${usage.output.toLocaleString()}`}
              />
              {usage.cacheRead > 0 && (
                <TooltipTrigger
                  handle={tooltipHandle}
                  render={
                    <span className="flex cursor-default items-center gap-0.5 px-1">
                      <RiDatabase2Line className="size-3" />
                      {fmtCompact(usage.cacheRead)}
                    </span>
                  }
                  payload={`Cache read: ${usage.cacheRead.toLocaleString()}`}
                />
              )}
              <TooltipTrigger
                handle={tooltipHandle}
                render={
                  <span className="cursor-default font-medium px-1">
                    ${usage.cost.total.toFixed(3)}
                  </span>
                }
                payload={`Total cost: $${usage.cost.total.toFixed(6)}`}
              />
              {agentId && projectId && (
                <TooltipTrigger
                  handle={tooltipHandle}
                  render={
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="ml-2 flex items-center justify-center rounded p-1 hover:bg-mauve-200 transition-colors"
                    >
                      <RiSettings3Line className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  }
                  payload="Session settings"
                />
              )}
              <TooltipContent handle={tooltipHandle} />
            </div>
          </TooltipProvider>
        )}
      </div>

      {agentId && projectId && (
        <SessionSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          agentId={agentId}
          projectId={projectId}
          currentModel={model}
          currentThinkingLevel={thinkingLevel}
          onModelChange={onModelChange}
          onThinkingLevelChange={onThinkingLevelChange}
        />
      )}
    </div>
  );
}
