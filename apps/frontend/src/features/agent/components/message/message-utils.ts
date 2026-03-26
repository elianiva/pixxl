import type { MessageBlock } from "../../hooks";
import type { StepType, ToolCallFromBlock } from "./message-types";

export function stepsFromBlocks(blocks: MessageBlock[], isStreaming: boolean): StepType[] {
  const steps: StepType[] = [];
  let currentThinking = "";
  let currentToolCalls: ToolCallFromBlock[] = [];
  let currentText = "";

  for (const block of blocks) {
    if (block.type === "thinking") {
      if (currentText) {
        steps.push({ type: "text", content: currentText });
        currentText = "";
      }
      if (currentToolCalls.length > 0) {
        steps.push({ type: "toolCalls", calls: currentToolCalls });
        currentToolCalls = [];
      }
      currentThinking += block.thinking;
    } else if (block.type === "toolCall") {
      if (currentThinking) {
        steps.push({
          type: "thinking",
          content: currentThinking,
          isStreaming: false,
        });
        currentThinking = "";
      }
      if (currentText) {
        steps.push({ type: "text", content: currentText });
        currentText = "";
      }
      currentToolCalls.push({
        id: block.id,
        name: block.name,
        params: block.arguments,
        status: "complete",
      });
    } else if (block.type === "text") {
      if (currentThinking) {
        steps.push({
          type: "thinking",
          content: currentThinking,
          isStreaming: false,
        });
        currentThinking = "";
      }
      if (currentToolCalls.length > 0) {
        steps.push({ type: "toolCalls", calls: currentToolCalls });
        currentToolCalls = [];
      }
      currentText += block.text;
    }
  }

  if (currentThinking) {
    steps.push({ type: "thinking", content: currentThinking, isStreaming });
  }
  if (currentToolCalls.length > 0) {
    steps.push({ type: "toolCalls", calls: currentToolCalls });
  }
  if (currentText) {
    steps.push({ type: "text", content: currentText });
  }

  return steps;
}

export function getPathFromParams(params: Record<string, unknown>): string {
  const path = (params?.path as string) ?? "";
  return path || "unknown";
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "..." : str;
}
