import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiArrowDownSLine, RiGlobalLine } from "@remixicon/react";

export type ModelOption = {
  id: string;
  name: string;
};

export const MODELS: ModelOption[] = [
  { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
  { id: "claude-opus-4", name: "Claude Opus 4" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "o3-mini", name: "o3-mini" },
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
          <DropdownMenuItem key={model.id} onClick={() => onSelect(model)} className="text-xs">
            {model.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
