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

export type MessageBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "toolCall"; id: string; name: string; arguments: Record<string, unknown> };

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
  blocks?: MessageBlock[];
};

function extractBlocksFromContent(content: unknown): MessageBlock[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (!Array.isArray(content)) return [];

  const blocks: MessageBlock[] = [];
  let currentThinking = "";

  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const block = item as { type?: string };

    if (block.type === "text" && typeof (item as { text?: string }).text === "string") {
      // Flush any accumulated thinking before adding text
      if (currentThinking) {
        blocks.push({ type: "thinking", thinking: currentThinking });
        currentThinking = "";
      }
      blocks.push({ type: "text", text: (item as { text: string }).text });
    } else if (
      block.type === "thinking" &&
      typeof (item as { thinking?: string }).thinking === "string"
    ) {
      // Accumulate consecutive thinking blocks into a single chain
      currentThinking += (item as { thinking: string }).thinking;
    } else if (
      block.type === "toolCall" &&
      typeof (item as { id?: string }).id === "string" &&
      typeof (item as { name?: string }).name === "string"
    ) {
      // Flush thinking BEFORE tool calls (not after)
      // This ensures: [thinking_before_tool] [tool] [thinking_after_tool] [text]
      // becomes: [thinking_before + thinking_after] [tool] [text]
      if (currentThinking) {
        blocks.push({ type: "thinking", thinking: currentThinking });
        currentThinking = "";
      }
      blocks.push({
        type: "toolCall",
        id: (item as { id: string }).id,
        name: (item as { name: string }).name,
        arguments: (item as { arguments?: Record<string, unknown> }).arguments ?? {},
      });
    }
  }

  // Flush any remaining thinking at the end
  if (currentThinking) {
    blocks.push({ type: "thinking", thinking: currentThinking });
  }

  // Post-process: merge consecutive thinking blocks
  // (can happen when thinking is split across tool calls)
  const mergedBlocks: MessageBlock[] = [];
  for (const block of blocks) {
    if (block.type === "thinking") {
      // Merge consecutive thinking blocks
      const lastBlock = mergedBlocks.at(-1);
      if (lastBlock?.type === "thinking") {
        lastBlock.thinking += block.thinking;
      } else {
        mergedBlocks.push(block);
      }
    } else {
      mergedBlocks.push(block);
    }
  }

  return mergedBlocks;
}

export function useActiveAgentId(): string | null {
  return useStore(agentStore, (state) => state.activeAgentId);
}

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
            role?: "user" | "assistant" | "toolResult";
            content?: unknown;
            thinking?: string;
          };
        };

        if (entry.type !== "message" || !entry.message) return acc;

        // Skip tool result messages - they're displayed via tool_end event handling
        if (entry.message.role === "toolResult") return acc;

        const message = entry.message;
        const blocks = extractBlocksFromContent(message.content);

        // For backward compatibility, also extract text, thinking, and toolCalls
        let text = "";
        let thinking: string | undefined;
        const toolCalls: Array<{
          id: string;
          name: string;
          params: unknown;
          status: "running" | "complete" | "error";
          output?: string;
          error?: string;
        }> = [];

        for (const block of blocks) {
          if (block.type === "text") text += block.text;
          else if (block.type === "thinking") thinking = (thinking ?? "") + block.thinking;
          else if (block.type === "toolCall") {
            toolCalls.push({
              id: block.id,
              name: block.name,
              params: block.arguments,
              status: "complete",
            });
          }
        }

        acc.push({
          id: entry.id,
          role: message.role === "assistant" ? "assistant" : "user",
          content: text,
          reasoning: thinking,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          blocks,
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
