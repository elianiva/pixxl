import { SettingRow } from "./setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectEntry } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_CONFIG, type Appearance } from "@pixxl/shared/schema/config";

interface AppearanceSettingsProps {
  appearance: Appearance;
  onUpdate: (appearance: Partial<Appearance>) => void;
}

const colorSchemes: SelectEntry[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function AppearanceSettings({ appearance, onUpdate }: AppearanceSettingsProps) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Appearance</h3>
      <div className="border border-border">
        <SettingRow label="Color Scheme" description="Choose your preferred theme">
          <Select
            value={appearance.colorScheme ?? DEFAULT_CONFIG.appearance.colorScheme}
            items={colorSchemes}
            onValueChange={(v) => v && onUpdate({ colorScheme: v as Appearance["colorScheme"] })}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorSchemes.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Compact Mode" description="Reduce spacing for denser UI">
          <Switch
            checked={appearance.compactMode ?? DEFAULT_CONFIG.appearance.compactMode}
            onCheckedChange={(checked) => onUpdate({ compactMode: checked })}
          />
        </SettingRow>
        <SettingRow label="Show Line Numbers" description="Display line numbers in editor">
          <Switch
            checked={appearance.showLineNumbers ?? DEFAULT_CONFIG.appearance.showLineNumbers}
            onCheckedChange={(checked) => onUpdate({ showLineNumbers: checked })}
          />
        </SettingRow>
      </div>
    </div>
  );
}
