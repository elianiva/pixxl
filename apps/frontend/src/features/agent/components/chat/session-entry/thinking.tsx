import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";

interface ThinkingRendererProps {
  thinking: string;
  isStreaming: boolean;
}

export function ThinkingRenderer({ thinking, isStreaming }: ThinkingRendererProps) {
  return (
    <Reasoning isStreaming={isStreaming} defaultOpen={isStreaming} className="mb-4">
      <ReasoningTrigger />
      <ReasoningContent>{thinking.trim()}</ReasoningContent>
    </Reasoning>
  );
}
