import { SettingRow, SettingRowToggle } from "./setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectEntry } from "@/components/ui/select";
import type { Agent } from "@pixxl/shared/schema/config";
import { useBlurSubmitSelect } from "../hooks/use-blur-submit";

interface AgentSettingsProps {
  agent: Agent;
  onUpdate: (agent: Partial<Agent>) => void;
}

const thinkingLevels: SelectEntry[] = [
  { value: "off", label: "Off" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra High" },
];

const transports: SelectEntry[] = [
  { value: "websocket", label: "WebSocket" },
  { value: "sse", label: "SSE" },
  { value: "auto", label: "Auto" },
];

const steeringModes: SelectEntry[] = [
  { value: "one-at-a-time", label: "One at a Time" },
  { value: "all", label: "All at Once" },
];

const providers: SelectEntry[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
];

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

export function AgentSettings({ agent, onUpdate }: AgentSettingsProps) {
  const defaultProviderSelect = useBlurSubmitSelect(agent.defaultProvider ?? "anthropic", (v) =>
    onUpdate({ defaultProvider: v }),
  );
  const thinkingLevelSelect = useBlurSubmitSelect(agent.defaultThinkingLevel ?? "medium", (v) =>
    onUpdate({ defaultThinkingLevel: v as Agent["defaultThinkingLevel"] }),
  );

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Agent</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Global default settings. Configure per-agent in the chat UI via the agent menu.
      </p>
      <div className="border border-border">
        <SettingRow label="Provider" description="AI provider for model selection">
          <Select
            value={agent.defaultProvider ?? "anthropic"}
            onValueChange={(v) => v && onUpdate({ defaultProvider: v })}
          >
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

        <SettingRow label="Model" description="Default AI model">
          <Select
            value={agent.defaultModel ?? ""}
            onValueChange={(v) => v && onUpdate({ defaultModel: v })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelsByProvider[agent.defaultProvider ?? "anthropic"]?.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Thinking Level" description="How much reasoning the model does">
          <Select
            value={agent.defaultThinkingLevel ?? "medium"}
            onValueChange={(v) =>
              v && onUpdate({ defaultThinkingLevel: v as Agent["defaultThinkingLevel"] })
            }
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

        <SettingRow label="Transport" description="Protocol for streaming responses">
          <Select
            value={agent.transport ?? "websocket"}
            onValueChange={(v) => v && onUpdate({ transport: v as Agent["transport"] })}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {transports.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Steering Mode" description="How queued messages are handled">
          <Select
            value={agent.steeringMode ?? "one-at-a-time"}
            onValueChange={(v) => v && onUpdate({ steeringMode: v as Agent["steeringMode"] })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {steeringModes.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Hide Thinking" description="Hide thinking block from output">
          <SettingRowToggle
            checked={agent.hideThinkingBlock ?? false}
            onCheckedChange={(checked) => onUpdate({ hideThinkingBlock: checked })}
          />
        </SettingRow>

        <SettingRow label="Skill Commands" description="Enable /skill:name commands">
          <SettingRowToggle
            checked={agent.enableSkillCommands ?? true}
            onCheckedChange={(checked) => onUpdate({ enableSkillCommands: checked })}
          />
        </SettingRow>
      </div>
    </div>
  );
}
