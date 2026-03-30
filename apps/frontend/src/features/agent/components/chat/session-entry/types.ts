import type { PiSessionEntry, BuiltinTool } from "@pixxl/shared";

export interface ContentBlockBase {
  type: string;
}

export interface TextBlock extends ContentBlockBase {
  type: "text";
  text: string;
}

export interface ThinkingBlockType extends ContentBlockBase {
  type: "thinking";
  thinking: string;
}

export interface CustomToolBlockType extends ContentBlockBase {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type ContentBlock = TextBlock | ThinkingBlockType | BuiltinTool | CustomToolBlockType;

export function isContentBlocks(content: unknown): content is ContentBlock[] {
  return Array.isArray(content) && content.every((c) => c && typeof c === "object" && "type" in c);
}

// Tool result lookup from entries
export function getToolResult(
  entries: readonly PiSessionEntry[],
  toolCallId: string,
): { output?: string; error?: string; isError: boolean } | undefined {
  for (const entry of entries) {
    if (entry.type === "message") {
      const msg = entry.message as
        | {
            role?: string;
            toolCallId?: string;
            content?: unknown;
            isError?: boolean;
          }
        | undefined;
      if (msg?.role === "toolResult" && msg.toolCallId === toolCallId) {
        // Extract text content from tool result
        let output = "";
        if (Array.isArray(msg.content)) {
          for (const c of msg.content) {
            if (typeof c === "object" && c !== null && (c as { type?: string }).type === "text") {
              output += (c as { text?: string }).text || "";
            }
          }
        } else if (typeof msg.content === "string") {
          output = msg.content;
        }
        return { output, error: msg.isError ? output : undefined, isError: msg.isError ?? false };
      }
    }
  }
  return undefined;
}

export interface SessionEntryProps {
  entry: PiSessionEntry;
  isStreaming: boolean;
  allEntries: readonly PiSessionEntry[];
}
