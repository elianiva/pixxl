import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiArrowDownSLine, RiGlobalLine } from "@remixicon/react";

export type ModelOption = {
  provider: string;
  id: string;
  name: string;
};

export const MODELS: ModelOption[] = [
  {
    provider: "anthropic",
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
  },
  {
    provider: "anthropic",
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
  },
  {
    provider: "openai",
    id: "gpt-4o",
    name: "GPT-4o",
  },
  {
    provider: "openai",
    id: "o3-mini",
    name: "o3-mini",
  },
];

interface ModelSelectorProps {
  selectedModel: ModelOption;
  onSelect: (model: ModelOption) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onSelect, disabled = false }: ModelSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="inline-flex h-6 items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <RiGlobalLine className="size-3.5" />
        <span>{selectedModel.name}</span>
        <RiArrowDownSLine className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {MODELS.map((model) => (
          <DropdownMenuItem
            key={`${model.provider}:${model.id}`}
            onClick={() => onSelect(model)}
            className="text-xs"
          >
            {model.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
