import {
  RiExchangeLine,
  RiBrainLine,
  RiScissorsLine,
  RiGitBranchLine,
  RiEditLine,
  RiPriceTagLine,
  RiSparklingLine,
  RiSettings3Line,
  type RemixiconComponentType,
} from "@remixicon/react";
import type { ActionType } from "../../hooks";
import { cn } from "@/lib/utils";

interface ActionItemProps {
  action: ActionType;
  className?: string;
}

const ACTION_CONFIG: Record<
  ActionType["type"],
  {
    icon: RemixiconComponentType;
    label: (action: ActionType) => string;
  }
> = {
  model_change: {
    icon: RiExchangeLine,
    label: (a) => {
      const action = a as Extract<ActionType, { type: "model_change" }>;
      // Format model name from ID (e.g., "anthropic/claude-sonnet-4-20250514" -> "Claude Sonnet 4")
      const modelName = action.modelId
        .split("/")
        .pop()
        ?.replace(/-/g, " ")
        .replace(/\d{8}$/, "")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `Changed model to ${modelName || action.modelId}`;
    },
  },
  thinking_level_change: {
    icon: RiBrainLine,
    label: (a) => {
      const action = a as Extract<ActionType, { type: "thinking_level_change" }>;
      const level = action.thinkingLevel.charAt(0).toUpperCase() + action.thinkingLevel.slice(1);
      return `Thinking level set to ${level}`;
    },
  },
  compaction: {
    icon: RiScissorsLine,
    label: () => "Session compacted",
  },
  branch_summary: {
    icon: RiGitBranchLine,
    label: () => "Branch summarized",
  },
  session_info: {
    icon: RiEditLine,
    label: (a) => {
      const action = a as Extract<ActionType, { type: "session_info" }>;
      return action.name ? `Session renamed to "${action.name}"` : "Session info updated";
    },
  },
  label: {
    icon: RiPriceTagLine,
    label: (a) => {
      const action = a as Extract<ActionType, { type: "label" }>;
      return action.label ? `Labeled: ${action.label}` : "Item labeled";
    },
  },
  custom: {
    icon: RiSettings3Line,
    label: (a) => {
      const action = a as Extract<ActionType, { type: "custom" }>;
      return `Custom: ${action.customType}`;
    },
  },
  custom_message: {
    icon: RiSparklingLine,
    label: (a) => {
      const action = a as Extract<ActionType, { type: "custom_message" }>;
      return `${action.customType}`;
    },
  },
};

export function ActionItem({ action, className }: ActionItemProps) {
  const config = ACTION_CONFIG[action.type];
  const Icon = config.icon;
  const label = config.label(action);

  return (
    <div className={cn("flex items-center justify-center py-3", className)}>
      <div className="flex-1 h-px bg-border/50" />
      <div className="flex items-center gap-2 px-4 text-xs text-muted-foreground whitespace-nowrap">
        <Icon className="size-3.5 opacity-70" />
        <span>{label}</span>
      </div>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}
