import { SettingRow } from "./setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/components/ui/select";
import type { SelectEntry } from "@/views/components/ui/select";
import { Slider } from "@/views/components/ui/slider";
import { Switch } from "@/views/components/ui/switch";

export function TerminalSettings({
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  cursorStyle,
  setCursorStyle,
  cursorBlink,
  setCursorBlink,
}: {
  fontSize: number;
  setFontSize: (v: number) => void;
  fontFamily: string;
  setFontFamily: (v: string) => void;
  cursorStyle: "block" | "underline" | "bar";
  setCursorStyle: (v: "block" | "underline" | "bar") => void;
  cursorBlink: boolean;
  setCursorBlink: (v: boolean) => void;
}) {
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

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Terminal</h3>
      <div className="border border-border">
        <SettingRow label="Font Size" description="Terminal text size in pixels">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-8">{fontSize}px</span>
            <Slider
              value={[fontSize]}
              onValueChange={(values) => {
                const val = Array.isArray(values) ? values[0] : values;
                setFontSize(val);
              }}
              min={10}
              max={24}
            />
          </div>
        </SettingRow>
        <SettingRow label="Font Family" description="Monospace font for the terminal">
          <Select value={fontFamily} onValueChange={(v) => setFontFamily(v ?? fontFamily)}>
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
            value={cursorStyle}
            onValueChange={(v) =>
              setCursorStyle((v ?? cursorStyle) as "block" | "underline" | "bar")
            }
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
          <Switch checked={cursorBlink} onCheckedChange={setCursorBlink} />
        </SettingRow>
        <SettingRow label="Shell" description="Default shell to use">
          <Select value="/bin/zsh" onValueChange={() => {}}>
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
