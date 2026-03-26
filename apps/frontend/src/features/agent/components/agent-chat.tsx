import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { ChatInput, type ChatSubmitOptions } from "./chat-input";
import { MessageList } from "./chat/message-list";
import { ChatScrollContainer } from "./chat/chat-scroll-container";
import { useAgentActions, useMessages, useIsStreaming } from "../hooks";

interface AgentChatProps {
  projectId: string;
  agentId: string;
}

interface QueuedMessage {
  text: string;
  type: "steer" | "followUp";
}

export function AgentChat({ projectId, agentId }: AgentChatProps) {
  const messages = useMessages(agentId);
  const { sendMessage, abortMessage } = useAgentActions(projectId, agentId);
  const isStreaming = useIsStreaming(agentId);

  const { data: runtimeState } = useQuery({
    queryKey: ["agent-runtime", projectId, agentId],
    queryFn: () => rpc.agent.getAgentRuntime({ projectId, agentId }),
    refetchInterval: 1000,
  });

  const queuedMessages: QueuedMessage[] = [
    ...(runtimeState?.queuedSteering ?? []).map((text: string) => ({
      text,
      type: "steer" as const,
    })),
    ...(runtimeState?.queuedFollowUp ?? []).map((text: string) => ({
      text,
      type: "followUp" as const,
    })),
  ];

  const handleSubmit = (text: string, _options: ChatSubmitOptions) => {
    void sendMessage(text, "immediate");
  };

  const handleQueueClick = (message: QueuedMessage) => {
    void sendMessage(message.text, message.type);
  };

  const handleAbort = () => {
    void abortMessage();
  };

  return (
    <div className="flex h-full flex-col">
      <ChatScrollContainer className="flex-1 overflow-y-auto px-4 py-4">
        <MessageList messages={messages} isStreaming={isStreaming} />
      </ChatScrollContainer>

      <ChatInput
        onSubmit={handleSubmit}
        onAbort={handleAbort}
        isStreaming={isStreaming}
        queuedMessages={queuedMessages}
        onQueueClick={handleQueueClick}
        placeholder="Ask anything..."
      />
    </div>
  );
}
