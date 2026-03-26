import { useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RiArrowDownSLine, RiGlobalLine } from "@remixicon/react";

export type ModelOption = {
  provider: string;
  id: string;
  name: string;
  fullId?: string;
};

interface ModelSelectorProps {
  selectedModel?: ModelOption;
  models: ReadonlyArray<ModelOption>;
  onSelect: (model: ModelOption) => void;
  disabled?: boolean;
}

function providerLabel(provider: string) {
  return provider
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ModelSelector({
  selectedModel,
  models,
  onSelect,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const groupedModels = useMemo(() => {
    const query = search.toLowerCase();

    // filter first (by model name or provider), then group (avoids empty groups)
    const filtered =
      query.length === 0
        ? models
        : models.filter(
            (m) => m.name.toLowerCase().includes(query) || m.provider.toLowerCase().includes(query),
          );

    const groups = new Map<string, ModelOption[]>();
    for (const model of filtered) {
      const existing = groups.get(model.provider);
      if (existing) existing.push(model);
      else groups.set(model.provider, [model]);
    }

    return Array.from(groups.entries());
  }, [models, search]);

  const selectedLabel = selectedModel?.name ?? "Select model";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled || models.length === 0}
        className="group/button inline-flex h-6 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-none border border-transparent bg-clip-padding px-2 text-xs font-medium whitespace-nowrap text-muted-foreground transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-expanded:bg-muted aria-expanded:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3"
      >
        <RiGlobalLine className="size-3.5" />
        <span>{selectedLabel}</span>
        <RiArrowDownSLine className="size-3" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 overflow-hidden rounded-none bg-popover/70 p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10 backdrop-blur-2xl backdrop-saturate-150"
      >
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder="Search models or providers..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-80">
            <CommandEmpty>No authenticated models found.</CommandEmpty>
            {groupedModels.map(([provider, providerModels]) => (
              <CommandGroup key={provider} heading={providerLabel(provider)}>
                {providerModels.map((model) => {
                  const key = model.fullId ?? `${model.provider}/${model.id}`;
                  const checked =
                    selectedModel?.provider === model.provider && selectedModel?.id === model.id;

                  return (
                    <CommandItem
                      key={key}
                      value={`${model.name} ${model.id} ${model.provider}`}
                      data-checked={checked}
                      onSelect={() => {
                        onSelect(model);
                        setOpen(false);
                      }}
                      className="items-start"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{model.name}</span>
                        <span className="text-[11px] text-muted-foreground">{model.id}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
