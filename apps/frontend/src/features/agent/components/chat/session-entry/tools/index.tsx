import type { BuiltinTool } from "@pixxl/shared";
import { BuiltinToolTask } from "./builtin-tool";
import { CustomToolBlock } from "./custom-tool";
import type { CustomToolBlockType } from "../types";

const BUILTIN_TOOL_NAMES = ["read", "write", "edit", "bash", "grep"] as const;
type BuiltinToolName = (typeof BUILTIN_TOOL_NAMES)[number];

function isBuiltinTool(toolCall: BuiltinTool | CustomToolBlockType): toolCall is BuiltinTool {
  return BUILTIN_TOOL_NAMES.includes(toolCall.name as BuiltinToolName);
}

interface ToolCallRendererProps {
  toolCall: BuiltinTool | CustomToolBlockType;
  isStreaming: boolean;
  result?: { output?: string; error?: string; isError: boolean };
  toolCount: number;
}

export function ToolCallRenderer({
  toolCall,
  isStreaming,
  result,
  toolCount,
}: ToolCallRendererProps) {
  if (isBuiltinTool(toolCall)) {
    return (
      <BuiltinToolTask
        tool={toolCall}
        isStreaming={isStreaming}
        result={result}
        toolCount={toolCount}
      />
    );
  }

  return (
    <CustomToolBlock
      name={toolCall.name}
      args={toolCall.arguments}
      isStreaming={isStreaming}
      result={result}
      toolCount={toolCount}
    />
  );
}

export { BuiltinToolTask, CustomToolBlock };
