import { SettingRow } from "@/features/config/components/setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectEntry } from "@/components/ui/select";
import type { AgentThinkingLevel } from "@pixxl/shared";
import { useModels } from "../../hooks";

const thinkingLevels: SelectEntry[] = [
  { value: "off", label: "Off" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra High" },
];

function providerLabel(provider: string) {
  return provider
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface ModelSettingsProps {
  provider: string;
  model: string;
  thinkingLevel: AgentThinkingLevel;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onThinkingLevelChange: (level: AgentThinkingLevel) => void;
  disabled?: boolean;
}

export function ModelSettings({
  provider,
  model,
  thinkingLevel,
  onProviderChange,
  onModelChange,
  onThinkingLevelChange,
  disabled = false,
}: ModelSettingsProps) {
  const availableModels = useModels();

  const providerOptions = Array.from(new Set(availableModels.map((m) => m.provider))).map((p) => ({
    value: p,
    label: providerLabel(p),
  }));

  const modelOptions = availableModels
    .filter((m) => m.provider === provider)
    .map((m) => ({ value: m.id, label: m.name }));

  const handleProviderChange = (nextProvider: string | null) => {
    if (!nextProvider) return;
    const nextModel = availableModels.find((m) => m.provider === nextProvider);
    onProviderChange(nextProvider);
    if (nextModel) {
      onModelChange(nextModel.id);
    }
  };

  return (
    <div className="border border-border">
      <SettingRow label="Provider" description="AI provider for model selection">
        <Select value={provider} onValueChange={handleProviderChange} disabled={disabled}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providerOptions.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="Model" description="AI model for this session">
        <Select value={model} onValueChange={(v) => v && onModelChange(v)} disabled={disabled}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {modelOptions.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="Thinking Level" description="How much reasoning the model does">
        <Select
          value={thinkingLevel}
          onValueChange={(v) => v && onThinkingLevelChange(v as AgentThinkingLevel)}
          disabled={disabled}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {thinkingLevels.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}
