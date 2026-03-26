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

interface ContentBlock {
  type?: string;
  text?: string;
  thinking?: string;
}

function extractFromContentBlocks(content: unknown): {
  text: string;
  thinking: string | undefined;
} {
  if (typeof content === "string") return { text: content, thinking: undefined };
  if (!Array.isArray(content)) return { text: "", thinking: undefined };

  let text = "";
  let thinking: string | undefined;

  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const block = item as ContentBlock;

    if (block.type === "text" && typeof block.text === "string") {
      text += block.text;
    }
    if (block.type === "thinking" && typeof block.thinking === "string") {
      thinking = (thinking ?? "") + block.thinking;
    }
  }

  return { text, thinking };
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
        const entry = item.entry as {
          type?: string;
          id: string;
          message?: {
            role?: "user" | "assistant";
            content?: unknown;
            thinking?: string;
          };
        };

        if (entry.type !== "message" || !entry.message) return acc;

        const message = entry.message;
        const { text, thinking } = extractFromContentBlocks(message.content);

        acc.push({
          id: entry.id,
          role: message.role === "assistant" ? "assistant" : "user",
          content: text,
          reasoning: thinking,
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

  const invalidateAgentQueries = useCallback(
    async (resolvedAgentId: string) => {
      await queryClient.invalidateQueries({
        queryKey: ["agent-runtime", projectId, resolvedAgentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["agent-interactions", projectId, resolvedAgentId],
      });
    },
    [projectId],
  );

  const configureSession = useCallback(
    async (resolvedAgentId: string, options?: ChatSubmitOptions) => {
      if (!options) return;

      await rpc.agent.configureAgentSession({
        projectId,
        agentId: resolvedAgentId,
        model: options.model,
        thinkingLevel: options.thinkingLevel,
      });
    },
    [projectId],
  );

  const sendMessage = useCallback(
    async (
      text: string,
      mode: "immediate" | "steer" | "followUp" = "immediate",
      options?: ChatSubmitOptions,
    ) => {
      const resolvedAgentId = targetAgentId;
      if (!resolvedAgentId) return;

      const requestId = mode === "immediate" ? beginAgentStream(resolvedAgentId, text) : null;

      try {
        await configureSession(resolvedAgentId, options);

        if (mode !== "immediate") {
          await rpc.agent.enqueueAgentPrompt({
            projectId,
            agentId: resolvedAgentId,
            text,
            mode,
          });

          return;
        }

        if (!requestId) {
          throw new Error("Missing request id for immediate prompt");
        }

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
        if (requestId) {
          failAgentStream(
            resolvedAgentId,
            requestId,
            error instanceof Error ? error.message : "Prompt failed",
          );
        }
      } finally {
        await invalidateAgentQueries(resolvedAgentId);
      }
    },
    [configureSession, invalidateAgentQueries, projectId, targetAgentId],
  );

  const abortMessage = useCallback(async () => {
    const resolvedAgentId = targetAgentId;
    if (!resolvedAgentId) return;

    await rpc.agent.abortAgent({
      projectId,
      agentId: resolvedAgentId,
    });

    await invalidateAgentQueries(resolvedAgentId);
  }, [invalidateAgentQueries, projectId, targetAgentId]);

  return {
    selectAgent: select,
    sendMessage,
    abortMessage,
    configureSession,
    activeAgentId: targetAgentId,
  };
}
