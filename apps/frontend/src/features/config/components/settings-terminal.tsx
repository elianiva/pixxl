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
import { Switch } from "@/components/ui/switch";
import { DEFAULT_CONFIG, type Terminal } from "@pixxl/shared/schema/config";
import { useBlurSubmitSlider } from "../hooks/use-blur-submit";

interface TerminalSettingsProps {
  terminal: Terminal;
  onUpdate: (terminal: Partial<Terminal>) => void;
}

const fontFamilies: SelectEntry[] = [
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Fira Code", label: "Fira Code" },
  { value: "SF Mono", label: "SF Mono" },
  { value: "Source Code Pro", label: "Source Code Pro" },
  { value: "Iosevka", label: "Iosevka" },
];

const cursorStyles: SelectEntry[] = [
  { value: "block", label: "Block" },
  { value: "underline", label: "Underline" },
  { value: "bar", label: "Bar" },
];

const shells: SelectEntry[] = [
  { value: "/bin/zsh", label: "Zsh" },
  { value: "/bin/bash", label: "Bash" },
  { value: "/bin/fish", label: "Fish" },
];

export function TerminalSettings({ terminal, onUpdate }: TerminalSettingsProps) {
  const fontSizeSlider = useBlurSubmitSlider(terminal.fontSize, (fontSize) =>
    onUpdate({ fontSize }),
  );

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Terminal</h3>
      <div className="border border-border">
        <SettingRow label="Font Size" description="Terminal text size in pixels">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-8">{fontSizeSlider.localValue}px</span>
            <Slider
              value={[fontSizeSlider.localValue]}
              onValueChange={fontSizeSlider.handleValueChange}
              onValueCommitted={fontSizeSlider.handleValueCommit}
              min={10}
              max={24}
            />
          </div>
        </SettingRow>
        <SettingRow label="Font Family" description="Monospace font for the terminal">
          <Select
            value={terminal.fontFamily ?? DEFAULT_CONFIG.terminal.fontFamily}
            onValueChange={(v) => v && onUpdate({ fontFamily: v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Cursor Style" description="Shape of the terminal cursor">
          <Select
            value={terminal.cursorStyle ?? DEFAULT_CONFIG.terminal.cursorStyle}
            onValueChange={(v) => v && onUpdate({ cursorStyle: v as Terminal["cursorStyle"] })}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cursorStyles.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Cursor Blink" description="Animate cursor when idle">
          <Switch
            checked={terminal.cursorBlink ?? DEFAULT_CONFIG.terminal.cursorBlink}
            onCheckedChange={(checked) => onUpdate({ cursorBlink: checked })}
          />
        </SettingRow>
        <SettingRow label="Shell" description="Default shell to use">
          <Select
            value={terminal.shell ?? DEFAULT_CONFIG.terminal.shell}
            onValueChange={(v) => v && onUpdate({ shell: v })}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shells.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </div>
    </div>
  );
}
