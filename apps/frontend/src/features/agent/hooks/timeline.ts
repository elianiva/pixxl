import { useMemo } from "react";
import { useAgentSubscription, useProjectId } from "./subscription";
import { useActiveAgentId } from "./state";
import type { PiSessionEntry } from "@pixxl/shared";

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
    isStreaming: entry.id.startsWith("streaming:"),
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

export function useChatTimeline(agentId?: string): TimelineItem[] {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useProjectId();

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

    return timeline;
  }, [streamState]);
}
