import type { MessageBlock } from "../../hooks";

export interface ToolCallFromBlock {
  id: string;
  name: string;
  params: unknown;
  status: "running" | "complete" | "error";
  output?: string;
  error?: string;
}

export type StepType =
  | { type: "thinking"; content: string; isStreaming: boolean }
  | { type: "toolCalls"; calls: ToolCallFromBlock[] }
  | { type: "text"; content: string };

export interface AgentMessageContentProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
    reasoning?: string;
    toolCalls?: Array<ToolCallFromBlock>;
    blocks?: MessageBlock[];
  };
  onFork?: (content: string) => void;
}
