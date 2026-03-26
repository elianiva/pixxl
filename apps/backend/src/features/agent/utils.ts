import type { SessionEntry } from "@mariozechner/pi-coding-agent";
import type { ModelChangeEntry, ThinkingLevelChangeEntry } from "./types";

/**
 * Extract the last model and thinking level config from session entries.
 */
export function extractLastConfig(entries: SessionEntry[]): {
  model?: { provider: string; id: string };
  thinkingLevel?: string;
} {
  let model: { provider: string; id: string } | undefined;
  let thinkingLevel: string | undefined;

  // Process entries in reverse to find the last config changes
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as SessionEntry & { type?: string };

    if (entry.type === "model_change" && !model) {
      const modelEntry = entry as unknown as ModelChangeEntry;
      model = { provider: modelEntry.provider, id: modelEntry.modelId };
    }

    if (entry.type === "thinking_level_change" && !thinkingLevel) {
      const levelEntry = entry as unknown as ThinkingLevelChangeEntry;
      thinkingLevel = levelEntry.thinkingLevel;
    }

    // Stop early if we found both
    if (model && thinkingLevel) break;
  }

  return { model, thinkingLevel };
}

/**
 * Extract text content from a message content array.
 */
export function extractTextFromContent(content: unknown): string {
  if (!Array.isArray(content)) return "";

  const chunks: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;

    const block = item as { type?: unknown; text?: unknown };
    if (block.type === "text" && typeof block.text === "string") {
      chunks.push(block.text);
    }
  }

  return chunks.join("");
}

/**
 * Extract tool output from partial result.
 */
export function extractToolOutput(partialResult: unknown): string {
  if (typeof partialResult === "string") return partialResult;
  if (!partialResult || typeof partialResult !== "object") return "";

  const value = partialResult as {
    content?: unknown;
    output?: unknown;
    details?: unknown;
  };

  const contentText = extractTextFromContent(value.content);
  if (contentText.length > 0) return contentText;

  if (typeof value.output === "string") return value.output;
  if (typeof value.details === "string") return value.details;

  return "";
}

/**
 * Extract error message from various error formats.
 */
export function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (!value || typeof value !== "object") return undefined;

  const maybeError = value as {
    message?: unknown;
    errorMessage?: unknown;
    content?: unknown;
  };

  if (typeof maybeError.errorMessage === "string" && maybeError.errorMessage.length > 0) {
    return maybeError.errorMessage;
  }

  if (typeof maybeError.message === "string" && maybeError.message.length > 0) {
    return maybeError.message;
  }

  const contentText = extractTextFromContent(maybeError.content);
  if (contentText.length > 0) return contentText;

  return undefined;
}
