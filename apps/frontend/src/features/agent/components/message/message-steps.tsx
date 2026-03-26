import { useState } from "react";
import { RiBrainLine, RiWrenchLine, RiArrowDownSLine } from "@remixicon/react";
import { ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
import { MessageResponse } from "@/components/ai-elements/message";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { StepType } from "./message-types";
import { ToolCallItem, ToolCallsGroup } from "./tool-renderer";

interface ChainStepsProps {
  steps: StepType[];
}

function CollapsibleStep({
  icon: Icon,
  label,
  status = "complete",
  children,
}: {
  icon: typeof RiBrainLine;
  label: string;
  status?: "complete" | "active" | "pending";
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChainOfThoughtStep
      icon={Icon}
      label={
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-4 text-left hover:text-foreground">
            <span className="shrink-0">{label}</span>
            <span className="flex-1 border-t border-accent" />
            <RiArrowDownSLine
              className={cn(
                "size-4 shrink-0 transition-transform",
                isOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      }
      status={status}
    />
  );
}

export function ChainSteps({ steps }: ChainStepsProps) {
  return (
    <>
      {steps.map((step, index) => {
        const key = `step-${index}`;

        switch (step.type) {
          case "thinking":
            return (
              <CollapsibleStep
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
              </CollapsibleStep>
            );

          case "toolCalls": {
            const group = ToolCallsGroup({ calls: step.calls });
            return (
              <CollapsibleStep
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
              </CollapsibleStep>
            );
          }

          case "text":
            return <ChainOfThoughtStep key={key} label="Drafting response" status="complete" />;
        }
      })}
    </>
  );
}
