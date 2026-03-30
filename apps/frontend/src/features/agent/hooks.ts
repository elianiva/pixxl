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
import { getModelsCollection } from "@/features/config/models-collection";
import type { ChatSubmitOptions } from "./components/chat/input";
import type { PiAvailableModel } from "@pixxl/shared";

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

// Action types for non-message entries in chat timeline
export type ActionType =
  | { type: "model_change"; provider: string; modelId: string }
  | { type: "thinking_level_change"; thinkingLevel: string }
  | { type: "compaction"; summary: string; firstKeptEntryId: string; tokensBefore: number }
  | { type: "branch_summary"; fromId: string; summary: string }
  | { type: "session_info"; name?: string }
  | { type: "label"; targetId: string; label?: string }
  | { type: "custom"; customType: string; data?: unknown }
  | { type: "custom_message"; customType: string; content: unknown };

export type ActionItem = {
  id: string;
  timestamp: string;
  action: ActionType;
};

export type TimelineItem =
  | { kind: "message"; data: Message }
  | { kind: "action"; data: ActionItem };

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

export function useChatTimeline(agentId?: string): TimelineItem[] {
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
    // First pass: collect tool results keyed by (parentId, toolCallId)
    const toolResults = new Map<string, { output?: string; error?: string; isError: boolean }>();

    for (const item of historyMessages) {
      const entry = item.entry as {
        type?: string;
        id: string;
        parentId?: string | null;
        message?: {
          role?: "user" | "assistant" | "toolResult";
          content?: unknown;
          thinking?: string;
          toolCallId?: string;
          toolName?: string;
          isError?: boolean;
        };
      };

      if (
        entry.type === "message" &&
        entry.message?.role === "toolResult" &&
        entry.message.toolCallId &&
        entry.parentId
      ) {
        // Store result keyed by "parentId:toolCallId"
        const key = `${entry.parentId}:${entry.message.toolCallId}`;
        const content = entry.message.content;

        // Extract text from content (handle both string and array of content parts)
        let resultText: string;
        if (typeof content === "string") {
          resultText = content;
        } else if (Array.isArray(content)) {
          resultText = content
            .map((c) => {
              if (typeof c === "object" && c !== null) {
                if (c.type === "text" && typeof c.text === "string") {
                  return c.text;
                }
                // Handle any other content part types
                return JSON.stringify(c);
              }
              return String(c);
            })
            .join("");
        } else {
          resultText = String(content ?? "");
        }

        toolResults.set(key, {
          output: resultText,
          isError: entry.message.isError ?? false,
        });
      }
    }

    // Second pass: process all entries into timeline items
    const timeline = historyMessages
      .toSorted((a, b) => a.order - b.order)
      .reduce<TimelineItem[]>((acc, item) => {
        const entry = item.entry as {
          type?: string;
          id: string;
          timestamp: string;
          message?: {
            role?: "user" | "assistant" | "toolResult";
            content?: unknown;
            thinking?: string;
          };
          // Action fields
          provider?: string;
          modelId?: string;
          thinkingLevel?: string;
          summary?: string;
          firstKeptEntryId?: string;
          tokensBefore?: number;
          fromId?: string;
          name?: string;
          targetId?: string;
          label?: string;
          customType?: string;
          data?: unknown;
          content?: unknown;
          display?: boolean;
        };

        if (!entry.type) return acc;

        // Process message entries
        if (entry.type === "message") {
          if (!entry.message || entry.message.role === "toolResult") return acc;

          const message = entry.message;
          const blocks = extractBlocksFromContent(message.content);

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
              const resultKey = `${entry.id}:${block.id}`;
              const result = toolResults.get(resultKey);

              toolCalls.push({
                id: block.id,
                name: block.name,
                params: block.arguments,
                status: result ? (result.isError ? "error" : "complete") : "running",
                output: result?.output,
                error: result?.error,
              });
            }
          }

          acc.push({
            kind: "message",
            data: {
              id: entry.id,
              role: message.role === "assistant" ? "assistant" : "user",
              content: text,
              reasoning: thinking,
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              blocks,
            },
          });
          return acc;
        }

        // Process action entries
        let action: ActionType | undefined;

        switch (entry.type) {
          case "model_change":
            if (entry.provider && entry.modelId) {
              action = {
                type: "model_change",
                provider: entry.provider,
                modelId: entry.modelId,
              };
            }
            break;
          case "thinking_level_change":
            if (entry.thinkingLevel) {
              action = {
                type: "thinking_level_change",
                thinkingLevel: entry.thinkingLevel,
              };
            }
            break;
          case "compaction":
            if (entry.summary && entry.firstKeptEntryId) {
              action = {
                type: "compaction",
                summary: entry.summary,
                firstKeptEntryId: entry.firstKeptEntryId,
                tokensBefore: entry.tokensBefore ?? 0,
              };
            }
            break;
          case "branch_summary":
            if (entry.fromId && entry.summary) {
              action = {
                type: "branch_summary",
                fromId: entry.fromId,
                summary: entry.summary,
              };
            }
            break;
          case "session_info":
            action = {
              type: "session_info",
              name: entry.name,
            };
            break;
          case "label":
            if (entry.targetId) {
              action = {
                type: "label",
                targetId: entry.targetId,
                label: entry.label,
              };
            }
            break;
          case "custom":
            if (entry.customType) {
              action = {
                type: "custom",
                customType: entry.customType,
                data: entry.data,
              };
            }
            break;
          case "custom_message":
            if (entry.customType && entry.display) {
              action = {
                type: "custom_message",
                customType: entry.customType,
                content: entry.content ?? {},
              };
            }
            break;
        }

        if (action) {
          acc.push({
            kind: "action",
            data: {
              id: entry.id,
              timestamp: entry.timestamp,
              action,
            },
          });
        }

        return acc;
      }, []);

    if (!streamState) return timeline;

    // Only show optimistic messages and filter history when actively streaming
    if (!streamState.isStreaming) {
      return timeline;
    }

    // Build set of optimistic IDs currently in stream
    const activeOptimisticIds = new Set<string>();
    if (streamState.optimisticUserMessage) {
      activeOptimisticIds.add(streamState.optimisticUserMessage.optimisticId);
    }
    if (streamState.draftAssistantMessage) {
      activeOptimisticIds.add(streamState.draftAssistantMessage.optimisticId);
    }

    // Filter out history entries that have active optimistic versions
    // and replace their IDs with optimistic IDs for smooth transition
    const filteredTimeline = timeline.filter((item) => {
      if (item.kind !== "message") return true;

      // Check if this history entry was finalized from an optimistic message
      const optimisticId = streamState.idMap.get(item.data.id);
      if (optimisticId && activeOptimisticIds.has(optimisticId)) {
        // Skip this history entry - optimistic version is showing
        return false;
      }

      return true;
    });

    // Add optimistic messages at the end
    const optimistic: TimelineItem[] = [];
    if (streamState.optimisticUserMessage) {
      optimistic.push({ kind: "message", data: toMessage(streamState.optimisticUserMessage) });
    }
    if (streamState.draftAssistantMessage) {
      optimistic.push({ kind: "message", data: toMessage(streamState.draftAssistantMessage) });
    }

    return [...filteredTimeline, ...optimistic];
  }, [historyMessages, streamState]);
}

/** @deprecated Use useChatTimeline instead */
export function useMessages(agentId?: string): Message[] {
  const timeline = useChatTimeline(agentId);
  return useMemo(
    () =>
      timeline
        .filter((item): item is { kind: "message"; data: Message } => item.kind === "message")
        .map((item) => item.data),
    [timeline],
  );
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

      // Refetch runtime and interactions (for model/thinking change entries in timeline)
      await invalidateAgentQueries(resolvedAgentId);
    },
    [projectId, invalidateAgentQueries],
  );

  const sendMessage = useCallback(
    async (
      text: string,
      mode: "immediate" | "steer" | "followUp" = "immediate",
      options?: ChatSubmitOptions,
    ) => {
      const resolvedAgentId = targetAgentId;
      if (!resolvedAgentId) return;

      const streamResult = mode === "immediate" ? beginAgentStream(resolvedAgentId, text) : null;
      const requestId = streamResult?.requestId ?? null;

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

        if (!requestId || !streamResult) {
          throw new Error("Missing request id for immediate prompt");
        }

        const stream = await rpc.agent.promptAgent({
          projectId,
          agentId: resolvedAgentId,
          text,
          userOptimisticId: streamResult.userOptimisticId,
          assistantOptimisticId: streamResult.assistantOptimisticId,
        });

        let eventCount = 0;
        for await (const event of stream) {
          eventCount++;
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

const modelsCollection = getModelsCollection();

export function useModels(): PiAvailableModel[] {
  const { data: models = [] } = useLiveQuery((q) => q.from({ model: modelsCollection }));
  return models as PiAvailableModel[];
}
