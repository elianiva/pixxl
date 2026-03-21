import { SettingRow } from "./setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/components/ui/select";
import type { SelectEntry } from "@/views/components/ui/select";
import { Switch } from "@/views/components/ui/switch";

export function AppearanceSettings({
  colorScheme,
  setColorScheme,
}: {
  colorScheme: "dark" | "light" | "system";
  setColorScheme: (v: "dark" | "light" | "system") => void;
}) {
  const colorSchemes: SelectEntry[] = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "system", label: "System" },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Appearance</h3>
      <div className="border border-border">
        <SettingRow label="Color Scheme" description="Choose your preferred theme">
          <Select
            value={colorScheme}
            onValueChange={(v) => setColorScheme((v ?? colorScheme) as "dark" | "light" | "system")}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorSchemes.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Compact Mode" description="Reduce spacing for denser UI">
          <Switch checked={false} onCheckedChange={() => { }} />
        </SettingRow>
        <SettingRow label="Show Line Numbers" description="Display line numbers in editor">
          <Switch checked={true} onCheckedChange={() => { }} />
        </SettingRow>
      </div>
    </div>
  );
}
