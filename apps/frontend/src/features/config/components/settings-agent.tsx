import { SettingRow, SettingRowToggle } from "./setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectEntry } from "@/components/ui/select";
import { DEFAULT_CONFIG, type Agent } from "@pixxl/shared/schema/config";
import { useModels } from "@/features/agent/hooks";

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

function providerLabel(provider: string) {
  return provider
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AgentSettings({ agent, onUpdate }: AgentSettingsProps) {
  const availableModels = useModels();

  const providerOptions = Array.from(new Set(availableModels.map((model) => model.provider))).map(
    (provider) => ({ value: provider, label: providerLabel(provider) }),
  );

  const fallbackProvider = providerOptions[0]?.value ?? DEFAULT_CONFIG.agent.defaultProvider;
  const provider =
    providerOptions.find((entry) => entry.value === agent.defaultProvider)?.value ??
    fallbackProvider;

  const modelOptions = availableModels
    .filter((model) => model.provider === provider)
    .map((model) => ({ value: model.id, label: model.name }));

  const thinkingLevel = agent.defaultThinkingLevel ?? DEFAULT_CONFIG.agent.defaultThinkingLevel;
  const transport = agent.transport ?? DEFAULT_CONFIG.agent.transport;
  const steeringMode = agent.steeringMode ?? DEFAULT_CONFIG.agent.steeringMode;
  const selectedModel =
    modelOptions.find((entry) => entry.value === agent.defaultModel)?.value ??
    modelOptions[0]?.value ??
    "";

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold">Agent</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Global default settings. Configure per-agent in the chat UI via the agent menu.
      </p>
      <div className="border border-border">
        <SettingRow label="Provider" description="AI provider for model selection">
          <Select
            value={provider}
            items={providerOptions}
            onValueChange={(nextProvider) => {
              if (!nextProvider) return;

              const nextModel = availableModels.find((model) => model.provider === nextProvider);
              onUpdate({
                defaultProvider: nextProvider,
                ...(nextModel ? { defaultModel: nextModel.id } : {}),
              });
            }}
          >
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

        <SettingRow label="Model" description="Default AI model">
          <Select
            value={selectedModel}
            items={modelOptions}
            onValueChange={(v) => v && onUpdate({ defaultModel: v })}
          >
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
            items={thinkingLevels}
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
            value={transport}
            items={transports}
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
            value={steeringMode}
            items={steeringModes}
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
            checked={agent.hideThinkingBlock ?? DEFAULT_CONFIG.agent.hideThinkingBlock}
            onCheckedChange={(checked) => onUpdate({ hideThinkingBlock: checked })}
          />
        </SettingRow>

        <SettingRow label="Skill Commands" description="Enable /skill:name commands">
          <SettingRowToggle
            checked={agent.enableSkillCommands ?? DEFAULT_CONFIG.agent.enableSkillCommands}
            onCheckedChange={(checked) => onUpdate({ enableSkillCommands: checked })}
          />
        </SettingRow>
      </div>
    </div>
  );
}
