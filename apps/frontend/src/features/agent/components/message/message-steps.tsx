import { RiBrainLine, RiWrenchLine } from "@remixicon/react";
import { ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
import { MessageResponse } from "@/components/ai-elements/message";
import type { StepType } from "./message-types";
import { ToolCallItem, ToolCallsGroup } from "./tool-renderer";

interface ChainStepsProps {
  steps: StepType[];
}

export function ChainSteps({ steps }: ChainStepsProps) {
  return (
    <>
      {steps.map((step, index) => {
        const key = `step-${index}`;

        switch (step.type) {
          case "thinking":
            return (
              <ChainOfThoughtStep
                key={key}
                icon={RiBrainLine}
                label={step.isStreaming ? "Thinking..." : "Thought"}
                status={step.isStreaming ? "active" : "complete"}
              >
                {step.content && (
                  <div className="text-muted-foreground">
                    <MessageResponse mode="static">{step.content}</MessageResponse>
                  </div>
                )}
              </ChainOfThoughtStep>
            );

          case "toolCalls": {
            const group = ToolCallsGroup({ calls: step.calls });
            return (
              <ChainOfThoughtStep
                key={key}
                icon={RiWrenchLine}
                label={group.label}
                status={group.status}
              >
                <div className="space-y-1">
                  {step.calls.map((tool) => (
                    <ToolCallItem key={tool.id} tool={tool} />
                  ))}
                </div>
              </ChainOfThoughtStep>
            );
          }

          case "text":
            return <ChainOfThoughtStep key={key} label="Drafting response" status="complete" />;
        }
      })}
    </>
  );
}
