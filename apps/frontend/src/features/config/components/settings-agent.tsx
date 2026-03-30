import { SettingRow, SettingRowToggle } from "./setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectEntry } from "@/components/ui/select";
import { usePiSettings, useUpdatePiSettings } from "@/features/pi-settings/hooks/use-pi-settings";
import { useModels } from "@/features/agent/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { PiSettings, PiPartialSettings } from "@pixxl/shared/contracts/pi-settings";

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

const followUpModes: SelectEntry[] = [
  { value: "one-at-a-time", label: "One at a Time" },
  { value: "all", label: "All at Once" },
];

const doubleEscapeActions: SelectEntry[] = [
  { value: "fork", label: "Fork" },
  { value: "tree", label: "Tree" },
  { value: "none", label: "None" },
];

const treeFilterModes: SelectEntry[] = [
  { value: "default", label: "Default" },
  { value: "no-tools", label: "No Tools" },
  { value: "user-only", label: "User Only" },
  { value: "labeled-only", label: "Labeled Only" },
  { value: "all", label: "All" },
];

function providerLabel(provider: string) {
  return provider
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AgentSettings() {
  const { data: settings, isLoading } = usePiSettings();
  const updateSettings = useUpdatePiSettings();
  const availableModels = useModels();

  if (isLoading || !settings) {
    return (
      <div>
        <h3 className="mb-4 text-base font-semibold">Agent</h3>
        <p className="mb-4 text-sm text-muted-foreground">Loading pi settings...</p>
        <div className="border border-border space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  const providerOptions = Array.from(new Set(availableModels.map((model) => model.provider))).map(
    (provider) => ({ value: provider, label: providerLabel(provider) }),
  );

  const currentProvider: string = settings.defaultProvider ?? providerOptions[0]?.value ?? "";
  const modelOptions = availableModels
    .filter((model) => model.provider === currentProvider)
    .map((model) => ({ value: model.id, label: model.name }));

  const currentModel: string = settings.defaultModel ?? modelOptions[0]?.value ?? "";
  const thinkingLevel = String(settings.defaultThinkingLevel ?? "medium");
  const transport = String(settings.transport ?? "websocket");
  const steeringMode = String(settings.steeringMode ?? "one-at-a-time");
  const followUpMode = String(settings.followUpMode ?? "one-at-a-time");
  const doubleEscapeAction = String(settings.doubleEscapeAction ?? "none");
  const treeFilterMode = String(settings.treeFilterMode ?? "default");

  const handleUpdate = (partial: PiPartialSettings) => {
    updateSettings.mutate(partial);
  };

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold">Agent</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Edit your pi configuration. Changes are saved to pi&apos;s config files.
      </p>
      <div className="border border-border">
        <SettingRow label="Provider" description="AI provider for model selection">
          <Select
            value={currentProvider}
            items={providerOptions}
            onValueChange={(nextProvider) => {
              if (!nextProvider) return;
              const nextModel = availableModels.find((model) => model.provider === nextProvider);
              handleUpdate({
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
            value={currentModel}
            items={modelOptions}
            onValueChange={(v) => v && handleUpdate({ defaultModel: v })}
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
              v && handleUpdate({ defaultThinkingLevel: v as PiSettings["defaultThinkingLevel"] })
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
            onValueChange={(v) => v && handleUpdate({ transport: v as PiSettings["transport"] })}
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
            onValueChange={(v) =>
              v && handleUpdate({ steeringMode: v as PiSettings["steeringMode"] })
            }
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

        <SettingRow label="Follow-up Mode" description="How follow-up suggestions are handled">
          <Select
            value={followUpMode}
            items={followUpModes}
            onValueChange={(v) =>
              v && handleUpdate({ followUpMode: v as PiSettings["followUpMode"] })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {followUpModes.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Hide Thinking" description="Hide thinking block from output">
          <SettingRowToggle
            checked={settings.hideThinkingBlock ?? false}
            onCheckedChange={(checked) => handleUpdate({ hideThinkingBlock: checked })}
          />
        </SettingRow>

        <SettingRow label="Skill Commands" description="Enable /skill:name commands">
          <SettingRowToggle
            checked={settings.enableSkillCommands ?? true}
            onCheckedChange={(checked) => handleUpdate({ enableSkillCommands: checked })}
          />
        </SettingRow>

        <SettingRow label="Double Escape Action" description="Action when pressing ESC twice">
          <Select
            value={doubleEscapeAction}
            items={doubleEscapeActions}
            onValueChange={(v) =>
              v && handleUpdate({ doubleEscapeAction: v as PiSettings["doubleEscapeAction"] })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {doubleEscapeActions.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Tree Filter Mode" description="Filter mode for session tree view">
          <Select
            value={treeFilterMode}
            items={treeFilterModes}
            onValueChange={(v) =>
              v && handleUpdate({ treeFilterMode: v as PiSettings["treeFilterMode"] })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {treeFilterModes.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Show Images" description="Show images in terminal">
          <SettingRowToggle
            checked={settings.terminal?.showImages ?? true}
            onCheckedChange={(checked) =>
              handleUpdate({
                terminal: {
                  showImages: checked,
                  clearOnShrink: settings.terminal?.clearOnShrink ?? false,
                },
              })
            }
          />
        </SettingRow>

        <SettingRow label="Clear on Shrink" description="Clear terminal when resizing smaller">
          <SettingRowToggle
            checked={settings.terminal?.clearOnShrink ?? false}
            onCheckedChange={(checked) =>
              handleUpdate({
                terminal: {
                  showImages: settings.terminal?.showImages ?? true,
                  clearOnShrink: checked,
                },
              })
            }
          />
        </SettingRow>

        <SettingRow label="Auto Resize Images" description="Automatically resize images">
          <SettingRowToggle
            checked={settings.images?.autoResize ?? true}
            onCheckedChange={(checked) =>
              handleUpdate({
                images: {
                  autoResize: checked,
                  blockImages: settings.images?.blockImages ?? false,
                },
              })
            }
          />
        </SettingRow>

        <SettingRow label="Block Images" description="Block all images from displaying">
          <SettingRowToggle
            checked={settings.images?.blockImages ?? false}
            onCheckedChange={(checked) =>
              handleUpdate({
                images: {
                  autoResize: settings.images?.autoResize ?? true,
                  blockImages: checked,
                },
              })
            }
          />
        </SettingRow>
      </div>
    </div>
  );
}
