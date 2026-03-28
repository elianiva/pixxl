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
import { terminalThemes, terminalFonts } from "@/features/terminal/themes";

interface TerminalSettingsProps {
  terminal: Terminal;
  onUpdate: (terminal: Partial<Terminal>) => void;
}

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

const themeItems: SelectEntry[] = terminalThemes.map((t) => ({ value: t.id, label: t.name }));
const fontItems: SelectEntry[] = terminalFonts.map((f) => ({ value: f.id, label: f.name }));

export function TerminalSettings({ terminal, onUpdate }: TerminalSettingsProps) {
  const fontSizeSlider = useBlurSubmitSlider(terminal.fontSize, (fontSize) =>
    onUpdate({ fontSize }),
  );

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Terminal</h3>
      <div className="border border-border">
        <SettingRow label="Theme" description="Color theme for all terminals">
          <Select
            value={terminal.themeId ?? DEFAULT_CONFIG.terminal.themeId}
            items={themeItems}
            onValueChange={(v) => v && onUpdate({ themeId: v })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {terminalThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: theme.theme.foreground }}
                    />
                    {theme.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Font" description="Font family for all terminals">
          <Select
            value={terminal.fontId ?? DEFAULT_CONFIG.terminal.fontId}
            items={fontItems}
            onValueChange={(v) => v && onUpdate({ fontId: v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {terminalFonts.map((font) => (
                <SelectItem key={font.id} value={font.id}>
                  {font.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Font Size" description="Text size for all terminals">
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
        <SettingRow label="Cursor Style" description="Shape of the terminal cursor">
          <Select
            value={terminal.cursorStyle ?? DEFAULT_CONFIG.terminal.cursorStyle}
            items={cursorStyles}
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
            items={shells}
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
