import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { ChatInput, type ChatSubmitOptions } from "./input";
import { Timeline } from "./message-list";
import { type ModelOption } from "../settings/model-selector";
import { type ThinkingLevel } from "../settings/thinking-selector";
import { EmptyChatState } from "./empty-state";
import { useAgentActions, useChatTimeline, useIsStreaming } from "../../hooks";
import { useAgentFrontendConfig } from "@/features/config/hooks/use-config";

import { useLiveQuery } from "@tanstack/react-db";
import { getModelsCollection } from "@/features/config/models-collection";

interface ChatProps {
  projectId: string;
  agentId: string;
}

interface QueuedMessage {
  text: string;
  type: "steer" | "followUp";
}

function pickInitialModel(
  models: ReadonlyArray<ModelOption>,
  runtimeModel?: ModelOption | null,
  defaults?: { defaultProvider: string; defaultModel: string },
) {
  if (runtimeModel) return runtimeModel;

  const configured = models.find(
    (model) => model.provider === defaults?.defaultProvider && model.id === defaults?.defaultModel,
  );
  return configured;
}

const modelsCollection = getModelsCollection();
export function Chat({ projectId, agentId }: ChatProps) {
  const timeline = useChatTimeline(agentId);
  const { sendMessage, abortMessage, configureSession } = useAgentActions(projectId, agentId);
  const isStreaming = useIsStreaming(agentId);
  const { data: models = [] } = useLiveQuery(modelsCollection);

  const { data: runtimeState } = useQuery({
    queryKey: ["agent-runtime", projectId, agentId],
    queryFn: () => rpc.agent.getAgentRuntime({ projectId, agentId }),
  });

  // Poll usage separately since it changes frequently
  const { data: usageData } = useQuery({
    queryKey: ["agent-usage", projectId, agentId],
    queryFn: () => rpc.agent.getAgentUsage({ projectId, agentId }),
    refetchInterval: 1000, // Poll every second while streaming
    refetchIntervalInBackground: false,
  });

  const { data: frontendConfig } = useAgentFrontendConfig();

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
    () => pickInitialModel(models, runtimeState?.model, frontendConfig),
    [frontendConfig, models, runtimeState?.model],
  );

  const initialThinkingLevel =
    runtimeState?.thinkingLevel ?? frontendConfig?.defaultThinkingLevel ?? "medium";

  const handleSubmit = (text: string, options: ChatSubmitOptions) =>
    sendMessage(text, "immediate", options);

  const handleQueueClick = (message: QueuedMessage) => {
    if (!initialModel) return;

    void sendMessage(message.text, message.type, {
      model: initialModel,
      thinkingLevel: initialThinkingLevel,
    });
  };

  const handleFork = (content: string) => {
    if (!initialModel) return;
    console.log("implement this", content);
  };

  const handleModelChange = (model: ModelOption) =>
    configureSession(agentId, { model, thinkingLevel: initialThinkingLevel });

  const handleThinkingLevelChange = (thinkingLevel: ThinkingLevel) => {
    if (!initialModel) return;
    void configureSession(agentId, { model: initialModel, thinkingLevel });
  };

  // Count only message items for empty state check
  const messageCount = timeline.filter((item) => item.kind === "message").length;

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable message area - flex-col-reverse keeps content at bottom */}
      <div className="flex-1 overflow-y-auto overscroll-y-none flex flex-col-reverse py-4 px-4">
        {messageCount < 1 ? (
          <EmptyChatState />
        ) : (
          <div className="max-w-3xl mx-auto w-full">
            <Timeline items={timeline} isStreaming={isStreaming} onFork={handleFork} />
          </div>
        )}
      </div>
      <div className="pb-2 w-full max-w-3xl mx-auto">
        <ChatInput
          onSubmit={handleSubmit}
          onAbort={abortMessage}
          isStreaming={isStreaming}
          queuedMessages={queuedMessages}
          onQueueClick={handleQueueClick}
          model={initialModel}
          thinkingLevel={initialThinkingLevel}
          onModelChange={handleModelChange}
          onThinkingLevelChange={handleThinkingLevelChange}
          usage={usageData?.usage}
          contextWindow={usageData?.contextWindow}
          placeholder="Ask anything..."
          projectId={projectId}
          agentId={agentId}
        />
      </div>
    </div>
  );
}
