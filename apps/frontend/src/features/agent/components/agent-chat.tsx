import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { ChatInput, type ChatSubmitOptions } from "./chat-input";
import { MessageList } from "./chat/message-list";
import { ChatScrollContainer } from "./chat/chat-scroll-container";
import { type ModelOption } from "./model-selector";
import { type ThinkingLevel } from "./thinking-level-selector";
import { useAgentActions, useMessages, useIsStreaming } from "../hooks";

interface AgentChatProps {
  projectId: string;
  agentId: string;
}

interface QueuedMessage {
  text: string;
  type: "steer" | "followUp";
}

function pickFallbackModel(
  models: ReadonlyArray<ModelOption>,
  runtimeModel?: ModelOption | null,
  defaults?: { defaultProvider: string; defaultModel: string },
) {
  if (runtimeModel) return runtimeModel;

  const configured = models.find(
    (model) => model.provider === defaults?.defaultProvider && model.id === defaults?.defaultModel,
  );
  if (configured) return configured;

  return models[0];
}

export function AgentChat({ projectId, agentId }: AgentChatProps) {
  const messages = useMessages(agentId);
  const { sendMessage, abortMessage, configureSession } = useAgentActions(projectId, agentId);
  const isStreaming = useIsStreaming(agentId);

  const { data: runtimeState } = useQuery({
    queryKey: ["agent-runtime", projectId, agentId],
    queryFn: () => rpc.agent.getAgentRuntime({ projectId, agentId }),
  });

  const { data: frontendConfig } = useQuery({
    queryKey: ["agent-frontend-config"],
    queryFn: () => rpc.agent.getAgentFrontendConfig(),
    staleTime: Infinity,
  });

  const models = frontendConfig?.availableModels ?? [];

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

  const initialModel = useMemo(
    () =>
      pickFallbackModel(
        models,
        runtimeState?.model,
        frontendConfig
          ? {
            defaultProvider: frontendConfig.defaultProvider,
            defaultModel: frontendConfig.defaultModel,
          }
          : undefined,
      ),
    [frontendConfig, models, runtimeState?.model],
  );

  const initialThinkingLevel =
    runtimeState?.thinkingLevel ?? frontendConfig?.defaultThinkingLevel ?? "medium";

  const handleSubmit = (text: string, options: ChatSubmitOptions) => {
    void sendMessage(text, "immediate", options);
  };

  const handleQueueClick = (message: QueuedMessage) => {
    if (!initialModel) return;

    void sendMessage(message.text, message.type, {
      model: initialModel,
      thinkingLevel: initialThinkingLevel,
    });
  };

  const handleFork = (content: string) => {
    // Fork creates a follow-up request with the response content as context
    // This allows getting an alternative response
    if (!initialModel) return;

    console.log("implement this", content);
  };

  const handleAbort = () => {
    void abortMessage();
  };

  const handleModelChange = (model: ModelOption) => {
    void configureSession(agentId, { model, thinkingLevel: initialThinkingLevel });
  };

  const handleThinkingLevelChange = (thinkingLevel: ThinkingLevel) => {
    if (!initialModel) return;
    void configureSession(agentId, { model: initialModel, thinkingLevel });
  };

  return (
    <div className="flex h-full flex-col w-full">
      <ChatScrollContainer className="flex-1 overflow-y-auto py-4 max-w-3xl w-full mx-auto">
        <MessageList messages={messages} isStreaming={isStreaming} onFork={handleFork} />
      </ChatScrollContainer>

      <ChatInput
        onSubmit={handleSubmit}
        onAbort={handleAbort}
        isStreaming={isStreaming}
        queuedMessages={queuedMessages}
        onQueueClick={handleQueueClick}
        models={models}
        initialModel={initialModel}
        initialThinkingLevel={initialThinkingLevel}
        onModelChange={handleModelChange}
        onThinkingLevelChange={handleThinkingLevelChange}
        placeholder="Ask anything..."
      />
    </div>
  );
}
