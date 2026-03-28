import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { InfoIcon } from "lucide-react";
import type { TerminalMetadata } from "@pixxl/shared";
import { terminalThemes, terminalFonts } from "../themes";

interface EditTerminalDialogProps {
  terminal: TerminalMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, name: string, settings: TerminalSettings) => void;
}

export interface TerminalSettings {
  themeId: string;
  fontId: string;
  fontSize: number;
}

export function EditTerminalDialog({
  terminal,
  open,
  onOpenChange,
  onUpdate,
}: EditTerminalDialogProps) {
  const [name, setName] = useState(terminal?.name ?? "");
  const [themeId, setThemeId] = useState<string>(terminal?.themeId ?? "catppuccin-mocha");
  const [fontId, setFontId] = useState<string>(terminal?.fontId ?? "jetbrains-mono");
  const [fontSize, setFontSize] = useState<number>(terminal?.fontSize ?? 14);

  const themeItems = terminalThemes.map((t) => ({ value: t.id, label: t.name }));
  const fontItems = terminalFonts.map((f) => ({ value: f.id, label: f.name }));

  // Sync values when terminal changes or dialog opens
  useEffect(() => {
    if (terminal) {
      setName(terminal.name);
      setThemeId(terminal.themeId);
      setFontId(terminal.fontId);
      setFontSize(terminal.fontSize);
    }
  }, [terminal?.id, open]);

  function submit() {
    if (!terminal || !name.trim()) return;
    onUpdate(terminal.id, name, {
      themeId,
      fontId,
      fontSize,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Terminal</DialogTitle>
          <DialogDescription>Update terminal settings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Terminal Name */}
          <div className="grid gap-2">
            <label htmlFor="terminal-name" className="text-sm font-medium">
              Terminal name
            </label>
            <Input
              id="terminal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-terminal"
            />
          </div>

          {/* Theme Selector */}
          <div className="grid gap-2">
            <label htmlFor="terminal-theme" className="text-sm font-medium">
              Theme
            </label>
            <Select
              value={themeId}
              items={themeItems}
              onValueChange={(value) => setThemeId(value ?? "catppuccin-mocha")}
            >
              <SelectTrigger id="terminal-theme">
                <SelectValue placeholder="Select a theme" />
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <InfoIcon className="h-3 w-3" />
              <span>Not seeing your theme? Open a request!</span>
            </div>
          </div>

          {/* Font Selector */}
          <div className="grid gap-2">
            <label htmlFor="terminal-font" className="text-sm font-medium">
              Font
            </label>
            <Select
              value={fontId}
              items={fontItems}
              onValueChange={(value) => setFontId(value ?? "jetbrains-mono")}
            >
              <SelectTrigger id="terminal-font">
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                {terminalFonts.map((font) => (
                  <SelectItem key={font.id} value={font.id}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="font-size" className="text-sm font-medium">
                Font size
              </label>
              <span className="text-xs text-muted-foreground">{fontSize}px</span>
            </div>
            <Slider
              id="font-size"
              min={10}
              max={24}
              step={1}
              value={[fontSize]}
              onValueChange={(values) => {
                const first = Array.isArray(values) ? values[0] : values;
                if (typeof first === "number") {
                  setFontSize(first);
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
