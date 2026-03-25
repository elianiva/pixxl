import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiArrowDownSLine, RiBrain4Line } from "@remixicon/react";

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high";

export const THINKING_LEVELS: { id: ThinkingLevel; name: string }[] = [
  { id: "off", name: "Off" },
  { id: "minimal", name: "Minimal" },
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
];

interface ThinkingLevelSelectorProps {
  thinkingLevel: ThinkingLevel;
  onSelect: (level: ThinkingLevel) => void;
  disabled?: boolean;
}

export function ThinkingLevelSelector({
  thinkingLevel,
  onSelect,
  disabled = false,
}: ThinkingLevelSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="inline-flex h-6 items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <RiBrain4Line className="size-3.5" />
        <span className="capitalize">{thinkingLevel}</span>
        <RiArrowDownSLine className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {THINKING_LEVELS.map((level) => (
          <DropdownMenuItem
            key={level.id}
            onClick={() => onSelect(level.id)}
            className="text-xs capitalize"
          >
            {level.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
