import { useCallback, useEffect, useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { projectStore } from "@/lib/project-store";
import { rpc } from "@/lib/rpc";
import { agentStore, selectAgent } from "./store";
import {
  applyAgentEvent,
  getStreamStateForAgent,
  setAgentEntries,
  streamStore,
} from "./stream-store";
import type { ChatSubmitOptions } from "./components/chat/input";
import type { PiAvailableModel, PiSessionEntry } from "@pixxl/shared";
import { useQuery } from "@tanstack/react-query";

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
      if (currentThinking) {
        blocks.push({ type: "thinking", thinking: currentThinking });
        currentThinking = "";
      }
      blocks.push({ type: "text", text: (item as { text: string }).text });
    } else if (
      block.type === "thinking" &&
      typeof (item as { thinking?: string }).thinking === "string"
    ) {
      currentThinking += (item as { thinking: string }).thinking;
    } else if (
      block.type === "toolCall" &&
      typeof (item as { id?: string }).id === "string" &&
      typeof (item as { name?: string }).name === "string"
    ) {
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

  if (currentThinking) {
    blocks.push({ type: "thinking", thinking: currentThinking });
  }

  // Merge consecutive thinking blocks
  const mergedBlocks: MessageBlock[] = [];
  for (const block of blocks) {
    if (block.type === "thinking") {
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

function entryToMessage(
  entry: PiSessionEntry,
  toolResults?: Map<string, { output?: string; error?: string; isError: boolean }>,
): Message | null {
  if (entry.type !== "message") return null;
  const msg = entry.message as
    | {
        role?: "user" | "assistant" | "toolResult";
        content?: unknown;
        thinking?: string;
        toolCallId?: string;
      }
    | undefined;
  if (!msg || msg.role === "toolResult") return null;

  const blocks = extractBlocksFromContent(msg.content);

  let text = "";
  let thinking: string | undefined;
  const toolCalls: Message["toolCalls"] = [];

  for (const block of blocks) {
    if (block.type === "text") text += block.text;
    else if (block.type === "thinking") thinking = (thinking ?? "") + block.thinking;
    else if (block.type === "toolCall") {
      const resultKey = `${entry.id}:${block.id}`;
      const result = toolResults?.get(resultKey);
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

  return {
    id: entry.id,
    role: msg.role === "assistant" ? "assistant" : "user",
    content: text,
    reasoning: thinking,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    blocks,
  };
}

function entryToActionItem(entry: PiSessionEntry): ActionItem | null {
  let action: ActionType | undefined;

  switch (entry.type) {
    case "model_change": {
      const provider = entry.provider as string | undefined;
      const modelId = entry.modelId as string | undefined;
      if (provider && modelId) {
        action = { type: "model_change", provider, modelId };
      }
      break;
    }
    case "thinking_level_change": {
      const thinkingLevel = entry.thinkingLevel as string | undefined;
      if (thinkingLevel) {
        action = { type: "thinking_level_change", thinkingLevel };
      }
      break;
    }
    case "compaction": {
      const summary = entry.summary as string | undefined;
      const firstKeptEntryId = entry.firstKeptEntryId as string | undefined;
      const tokensBefore = entry.tokensBefore as number | undefined;
      if (summary && firstKeptEntryId) {
        action = { type: "compaction", summary, firstKeptEntryId, tokensBefore: tokensBefore ?? 0 };
      }
      break;
    }
    case "branch_summary": {
      const fromId = entry.fromId as string | undefined;
      const summary = entry.summary as string | undefined;
      if (fromId && summary) {
        action = { type: "branch_summary", fromId, summary };
      }
      break;
    }
    case "session_info": {
      const name = entry.name as string | undefined;
      action = { type: "session_info", name };
      break;
    }
    case "label": {
      const targetId = entry.targetId as string | undefined;
      const label = entry.label as string | undefined;
      if (targetId) {
        action = { type: "label", targetId, label };
      }
      break;
    }
    case "custom": {
      const customType = entry.customType as string | undefined;
      const data = entry.data;
      if (customType) {
        action = { type: "custom", customType, data };
      }
      break;
    }
    case "custom_message": {
      const customType = entry.customType as string | undefined;
      const display = entry.display as boolean | undefined;
      const content = entry.content;
      if (customType && display) {
        action = { type: "custom_message", customType, content };
      }
      break;
    }
  }

  if (!action) return null;

  return {
    id: entry.id,
    timestamp: entry.timestamp,
    action,
  };
}

export function useActiveAgentId(): string | null {
  return useStore(agentStore, (state) => state.activeAgentId);
}

// Subscribe to agent events - for initial load and reconnection
function useAgentSubscription(agentId: string | null, projectId: string | null) {
  const streamState = useStore(streamStore, (state) =>
    agentId ? getStreamStateForAgent(state, agentId) : null,
  );

  useEffect(() => {
    if (!agentId || !projectId) return;

    let isActive = true;
    const abortController = new AbortController();

    const subscribe = async () => {
      try {
        // First, load existing history
        const history = await rpc.agent.getAgentHistory({ projectId, agentId });
        if (history?.entries && isActive) {
          setAgentEntries(agentId, history.entries as PiSessionEntry[]);
        }

        // Then subscribe to live events
        const stream = await rpc.agent.subscribeAgent({ projectId, agentId });

        for await (const event of stream) {
          if (!isActive || abortController.signal.aborted) break;
          applyAgentEvent(agentId, null, event);

          if (
            event.type === "error" ||
            (event.type === "status_change" &&
              (event.status === "idle" || event.status === "error"))
          ) {
            break;
          }
        }
      } catch (error) {
        console.error("Agent subscription error:", error);
      }
    };

    subscribe();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [agentId, projectId]);

  return streamState;
}

export function useChatTimeline(agentId?: string): TimelineItem[] {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useStore(projectStore, (state) => state.currentProjectId);

  const streamState = useAgentSubscription(targetAgentId, projectId);

  return useMemo(() => {
    if (!streamState) return [];

    // Build tool results map from entries
    const toolResults = new Map<string, { output?: string; error?: string; isError: boolean }>();
    for (const entry of streamState.entries) {
      if (
        entry.type === "message" &&
        (entry.message as { role?: string })?.role === "toolResult" &&
        (entry.message as { toolCallId?: string })?.toolCallId &&
        entry.parentId
      ) {
        const key = `${entry.parentId}:${(entry.message as { toolCallId: string }).toolCallId}`;
        const content = (entry.message as { content?: unknown }).content;
        let resultText = "";
        if (typeof content === "string") {
          resultText = content;
        } else if (Array.isArray(content)) {
          resultText = content
            .map((c) => {
              if (
                typeof c === "object" &&
                c !== null &&
                c.type === "text" &&
                typeof c.text === "string"
              ) {
                return c.text;
              }
              return JSON.stringify(c);
            })
            .join("");
        }
        toolResults.set(key, {
          output: resultText,
          isError: (entry.message as { isError?: boolean }).isError ?? false,
        });
      }
    }

    // Convert entries to timeline items
    const timeline: TimelineItem[] = [];

    for (const entry of streamState.entries) {
      if (entry.type === "message") {
        const msg = entryToMessage(entry, toolResults);
        if (msg) {
          timeline.push({ kind: "message", data: msg });
        }
      } else {
        const action = entryToActionItem(entry);
        if (action) {
          timeline.push({ kind: "action", data: action });
        }
      }
    }

    // Add partial entry if streaming
    if (streamState.isStreaming && streamState.partialEntry) {
      timeline.push({
        kind: "message",
        data: {
          id: streamState.partialEntry.entryId,
          role: "assistant",
          content: streamState.partialEntry.content,
          reasoning: streamState.partialEntry.reasoning,
          isStreaming: true,
          toolCalls:
            streamState.partialEntry.toolCalls.length > 0
              ? streamState.partialEntry.toolCalls
              : undefined,
        },
      });
    }

    return timeline;
  }, [streamState]);
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

  const configureSession = useCallback(
    async (resolvedAgentId: string, options?: ChatSubmitOptions) => {
      if (!options) return;

      if (options.model && options.thinkingLevel) {
        await rpc.agent.configureAgentSession({
          projectId,
          agentId: resolvedAgentId,
          model: options.model,
          thinkingLevel: options.thinkingLevel,
        });
      } else if (options.model) {
        await rpc.agent.setAgentModel({
          projectId,
          agentId: resolvedAgentId,
          model: options.model,
        });
      } else if (options.thinkingLevel) {
        await rpc.agent.setAgentThinkingLevel({
          projectId,
          agentId: resolvedAgentId,
          thinkingLevel: options.thinkingLevel,
        });
      }
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

      // For immediate mode, start the prompt
      // The subscription will handle the stream events
      await rpc.agent.promptAgent({
        projectId,
        agentId: resolvedAgentId,
        text,
      });
    },
    [configureSession, projectId, targetAgentId],
  );

  const abortMessage = useCallback(async () => {
    const resolvedAgentId = targetAgentId;
    if (!resolvedAgentId) return;

    await rpc.agent.abortAgent({
      projectId,
      agentId: resolvedAgentId,
    });
  }, [projectId, targetAgentId]);

  return {
    selectAgent: select,
    sendMessage,
    abortMessage,
    configureSession,
    activeAgentId: targetAgentId,
  };
}

export function useModels(): readonly PiAvailableModel[] {
  const { data: models = [] } = useQuery({
    queryKey: ["available-models"],
    queryFn: () => rpc.agent.listAvailableModels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  return models as readonly PiAvailableModel[];
}
