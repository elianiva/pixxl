import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { ChatInput, type ChatSubmitOptions, type FileEditStats } from "./input";
import { MessageList } from "./message-list";
import { type ModelOption } from "../settings/model-selector";
import { type ThinkingLevel } from "../settings/thinking-selector";
import { EmptyChatState } from "./empty-state";
import { useAgentActions, useAgentEntries, useIsStreaming } from "../../hooks";
import { useAgentFrontendConfig } from "@/features/config/hooks/use-config";
import type { PiSessionEntry } from "@pixxl/shared";

import { useLiveQuery } from "@tanstack/react-db";
import { getModelsCollection } from "@/features/config/models-collection";

/** Count newlines in text to estimate lines changed */
function countLines(text: string): number {
  if (!text) return 0;
  // Count actual newlines, plus 1 if there's content after the last newline
  const newlines = (text.match(/\n/g) || []).length;
  const hasTrailingContent = text.length > 0 && !text.endsWith("\n");
  return newlines + (hasTrailingContent ? 1 : 0);
}

/** Calculate file edit stats from session entries */
function calculateFileEditStats(entries: readonly PiSessionEntry[]): FileEditStats {
  let additions = 0;
  let deletions = 0;

  for (const entry of entries) {
    if (entry.type !== "message") continue;
    const msg = entry.message as { role?: string; content?: unknown } | undefined;
    if (!msg || msg.role !== "assistant") continue;

    // Content is array of content blocks
    const content = msg.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (typeof block !== "object" || block === null) continue;
      const typedBlock = block as { type?: string; name?: string; arguments?: unknown };
      if (typedBlock.type !== "toolCall") continue;

      // Handle edit tool
      if (typedBlock.name === "edit") {
        const args = typedBlock.arguments as
          | { edits?: Array<{ oldText?: string; newText?: string }> }
          | undefined;
        if (!args?.edits) continue;
        for (const edit of args.edits) {
          deletions += countLines(edit.oldText || "");
          additions += countLines(edit.newText || "");
        }
      }

      // Handle write tool (treat as all additions since old content is empty)
      if (typedBlock.name === "write") {
        const args = typedBlock.arguments as { content?: string } | undefined;
        if (args?.content) {
          additions += countLines(args.content);
        }
      }
    }
  }

  return { additions, deletions };
}

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
  const { entries } = useAgentEntries(agentId, projectId);
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

  const handleModelChange = (model: ModelOption) =>
    configureSession(agentId, { model, thinkingLevel: initialThinkingLevel });

  const handleThinkingLevelChange = (thinkingLevel: ThinkingLevel) => {
    if (!initialModel) return;
    void configureSession(agentId, { model: initialModel, thinkingLevel });
  };

  // Count only message items for empty state check
  const messageCount = entries.filter((e) => e.type === "message").length;

  // Calculate file edit stats from current session
  const fileEditStats = useMemo(() => calculateFileEditStats(entries), [entries]);

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable message area - flex-col-reverse keeps content at bottom */}
      <div className="flex-1 overflow-y-auto overscroll-y-none flex flex-col-reverse py-4 px-4">
        {messageCount < 1 ? (
          <EmptyChatState />
        ) : (
          <div className="max-w-3xl mx-auto w-full">
            <MessageList entries={entries} isStreaming={isStreaming} />
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
          fileEditStats={fileEditStats}
        />
      </div>
    </div>
  );
}
