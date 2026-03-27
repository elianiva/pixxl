import { Switch } from "@/components/ui/switch";

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SettingRowToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingRowToggle({ checked, onCheckedChange }: SettingRowToggleProps) {
  return <Switch checked={checked} onCheckedChange={onCheckedChange} />;
}
