import { cn } from "@/lib/utils";
import { AgentMessageContent } from "../agent-message-content";

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
}

interface MessageBubbleProps {
  message: Message;
  onFork?: (content: string) => void;
}

export function MessageBubble({ message, onFork }: MessageBubbleProps) {
  return (
    <div className={cn("group flex", message.role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%]",
          message.role === "user"
            ? "bg-primary px-3 py-2 text-primary-foreground"
            : "px-0 py-1 text-foreground",
        )}
      >
        {message.role === "assistant" ? (
          <AgentMessageContent message={message} onFork={onFork} />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        )}
      </div>
    </div>
  );
}
