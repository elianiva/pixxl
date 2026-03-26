import { MessageBubble } from "./message-bubble";
import { StreamingIndicator } from "./streaming-indicator";
import { EmptyChatState } from "./empty-chat-state";

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

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onFork?: (content: string) => void;
}

export function MessageList({ messages, isStreaming, onFork }: MessageListProps) {
  if (messages.length === 0) {
    return <EmptyChatState />;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onFork={onFork} />
      ))}
      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
