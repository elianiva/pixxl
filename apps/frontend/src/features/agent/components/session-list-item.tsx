"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SessionListItemProps {
  session: {
    id: string;
    name: string;
    status: "idle" | "streaming" | "error";
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
    }>;
  };
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export const SessionListItem = memo(function SessionListItem({
  session,
  isActive,
  onSelect,
  onClose,
}: SessionListItemProps) {
  const lastMessage = session.messages.at(-1);
  const preview = lastMessage?.content.slice(0, 50) ?? "No messages yet";
  const isStreaming = session.status === "streaming";

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      onClick={onSelect}
    >
      {/* Status indicator */}
      <div
        className={cn(
          "size-2 shrink-0 rounded-full",
          isStreaming && "animate-pulse bg-primary",
          session.status === "error" && "bg-destructive",
          session.status === "idle" && "bg-muted-foreground/30",
        )}
      />

      {/* Session info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{session.name}</span>
          {isStreaming && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary">
              streaming
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{preview}</p>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-5 shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            d="M6 18L18 6M6 6l12 12"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </Button>
    </div>
  );
});
