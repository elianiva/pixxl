import { useCallback, useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { useLiveQuery } from "@tanstack/react-db";
import { projectStore } from "@/lib/project-store";
import { rpc } from "@/lib/rpc";
import { queryClient } from "@/lib/query-client";
import { getInteractionsCollection } from "./interactions-collection";
import { agentStore, selectAgent } from "./store";
import {
  applyAgentEvent,
  beginAgentStream,
  failAgentStream,
  finishAgentStream,
  getStreamStateForAgent,
  streamStore,
  type StreamMessage,
} from "./stream-store";
import type { ChatSubmitOptions } from "./components/chat-input";

function messageTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const block = item as { type?: unknown; text?: unknown };
      return block.type === "text" && typeof block.text === "string" ? block.text : "";
    })
    .join("");
}

export function useActiveAgentId(): string | null {
  return useStore(agentStore, (state) => state.activeAgentId);
}

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    params: unknown;
    status: "running" | "complete" | "error";
    output?: string;
    error?: string;
  }>;
};

function toMessage(message: StreamMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    reasoning: message.reasoning,
    isStreaming: message.isStreaming,
    toolCalls: message.toolCalls,
  };
}

export function useMessages(agentId?: string): Message[] {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useStore(projectStore, (state) => state.currentProjectId);
  const streamState = useStore(streamStore, (state) =>
    targetAgentId ? getStreamStateForAgent(state, targetAgentId) : null,
  );

  const { data: historyMessages = [] } = useLiveQuery(
    getInteractionsCollection(projectId as string, targetAgentId as string),
  );

  return useMemo(() => {
    const persisted = historyMessages
      .toSorted((a, b) => a.order - b.order)
      .reduce<Message[]>((acc, item) => {
        if (item.entry.type !== "message") return acc;

        const message = item.entry.message as {
          role?: "user" | "assistant";
          content?: unknown;
          thinking?: string;
        };

        acc.push({
          id: item.entry.id,
          role: message.role === "assistant" ? "assistant" : "user",
          content: messageTextFromContent(message.content),
          reasoning: message.thinking,
        });

        return acc;
      }, []);

    if (!streamState) return persisted;

    const optimistic: Message[] = [];
    if (streamState.optimisticUserMessage)
      optimistic.push(toMessage(streamState.optimisticUserMessage));
    if (streamState.draftAssistantMessage)
      optimistic.push(toMessage(streamState.draftAssistantMessage));

    return [...persisted, ...optimistic];
  }, [historyMessages, streamState]);
}

export function useIsStreaming(agentId?: string) {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;

  return useStore(streamStore, (state) =>
    targetAgentId ? getStreamStateForAgent(state, targetAgentId).isStreaming : false,
  );
}

export function useAgentActions(projectId: string, agentId?: string) {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;

  const select = useCallback((nextAgentId: string | null) => {
    selectAgent(nextAgentId);
  }, []);

  const sendMessage = useCallback(
    async (
      text: string,
      mode: "immediate" | "steer" | "followUp" = "immediate",
      options?: ChatSubmitOptions,
    ) => {
      const resolvedAgentId = targetAgentId;
      if (!resolvedAgentId) return;

      if (mode !== "immediate") {
        await rpc.agent.enqueueAgentPrompt({
          projectId,
          agentId: resolvedAgentId,
          text,
          mode,
        });

        await queryClient.invalidateQueries({
          queryKey: ["agent-runtime", projectId, resolvedAgentId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["agent-interactions", projectId, resolvedAgentId],
        });
        return;
      }

      const requestId = beginAgentStream(resolvedAgentId, text);

      try {
        void options;

        const stream = await rpc.agent.promptAgent({
          projectId,
          agentId: resolvedAgentId,
          text,
        });

        for await (const event of stream) {
          applyAgentEvent(resolvedAgentId, requestId, event);
        }

        finishAgentStream(resolvedAgentId, requestId);
      } catch (error) {
        failAgentStream(
          resolvedAgentId,
          requestId,
          error instanceof Error ? error.message : "Prompt failed",
        );
      } finally {
        await queryClient.invalidateQueries({
          queryKey: ["agent-runtime", projectId, resolvedAgentId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["agent-interactions", projectId, resolvedAgentId],
        });
      }
    },
    [projectId, targetAgentId],
  );

  const abortMessage = useCallback(async () => {
    const resolvedAgentId = targetAgentId;
    if (!resolvedAgentId) return;

    await rpc.agent.abortAgent({
      projectId,
      agentId: resolvedAgentId,
    });

    await queryClient.invalidateQueries({
      queryKey: ["agent-runtime", projectId, resolvedAgentId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["agent-interactions", projectId, resolvedAgentId],
    });
  }, [projectId, targetAgentId]);

  return {
    selectAgent: select,
    sendMessage,
    abortMessage,
    activeAgentId: targetAgentId,
  };
}
