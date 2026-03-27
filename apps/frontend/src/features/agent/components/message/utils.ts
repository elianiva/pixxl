import type { MessageBlock } from "../../hooks";
import type { StepType, ToolCallFromBlock } from "./types";

export function stepsFromBlocks(blocks: MessageBlock[], _isStreaming: boolean): StepType[] {
  const steps: StepType[] = [];
  let currentThinking = "";
  let currentToolCalls: ToolCallFromBlock[] = [];

  const flushThinking = () => {
    if (currentThinking) {
      steps.push({
        type: "thinking",
        content: currentThinking,
        isStreaming: false,
      });
      currentThinking = "";
    }
  };

  const flushToolCalls = () => {
    if (currentToolCalls.length > 0) {
      steps.push({
        type: "toolCalls",
        calls: currentToolCalls,
      });
      currentToolCalls = [];
    }
  };

  for (const block of blocks) {
    if (block.type === "thinking") {
      // Flush any tools before accumulating thinking
      flushToolCalls();
      // Accumulate consecutive thinking blocks
      currentThinking += block.thinking;
    } else if (block.type === "toolCall") {
      // Flush any thinking before accumulating tools
      flushThinking();
      // Accumulate consecutive tool calls
      currentToolCalls.push({
        id: block.id,
        name: block.name,
        params: block.arguments,
        status: "complete",
      });
    } else if (block.type === "text") {
      // Flush both before text
      flushThinking();
      flushToolCalls();
      steps.push({ type: "text", content: block.text });
    }
  }

  // Flush any remaining at the end
  flushThinking();
  flushToolCalls();

  return steps;
}

export function getPathFromParams(params: Record<string, unknown>): string {
  const path = (params?.path as string) ?? "";
  return path || "unknown";
}
