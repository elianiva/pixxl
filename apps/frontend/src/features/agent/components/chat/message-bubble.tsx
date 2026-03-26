import { cn } from "@/lib/utils";
import { AgentMessageContent } from "../message";

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
          message.role === "user"
            ? "max-w-4/5 bg-primary px-3 py-2 text-primary-foreground"
            : "w-full px-0 py-1 text-foreground",
        )}
      >
        {message.role === "assistant" ? (
          <AgentMessageContent message={message} onFork={onFork} />
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}
