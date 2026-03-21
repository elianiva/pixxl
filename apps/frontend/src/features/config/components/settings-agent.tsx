import { SettingRow } from "./setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectEntry } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { Agent } from "@pixxl/shared/schema/config";

interface AgentSettingsProps {
  agent: Agent;
  onUpdate: (agent: Partial<Agent>) => void;
}

const modelsByProvider: Record<string, SelectEntry[]> = {
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp" },
  ],
};

const providers: SelectEntry[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
];

const maxTokenOptions: SelectEntry[] = [
  { value: "4096", label: "4,096" },
  { value: "8192", label: "8,192" },
  { value: "16384", label: "16,384" },
  { value: "32768", label: "32,768" },
];

export function AgentSettings({ agent, onUpdate }: AgentSettingsProps) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Agent</h3>
      <div className="border border-border">
        <SettingRow label="Agent Name" description="What to call your coding assistant">
          <Input
            value={agent.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="pi"
          />
        </SettingRow>
        <SettingRow label="Provider" description="AI provider to use for the agent">
          <Select value={agent.provider} onValueChange={(v) => v && onUpdate({ provider: v })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Model" description="AI model to use">
          <Select value={agent.model} onValueChange={(v) => v && onUpdate({ model: v })}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelsByProvider[agent.provider]?.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Max Tokens" description="Maximum response length">
          <Select
            value={String(agent.maxTokens)}
            onValueChange={(v) => v && onUpdate({ maxTokens: Number(v) })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {maxTokenOptions.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Temperature"
          description="Response creativity (0 = focused, 1 = creative)"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-8">{agent.temperature}</span>
            <Slider
              value={[agent.temperature]}
              onValueChange={(values) => {
                const val = Array.isArray(values) ? values[0] : values;
                onUpdate({ temperature: val });
              }}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
        </SettingRow>
      </div>
    </div>
  );
}
