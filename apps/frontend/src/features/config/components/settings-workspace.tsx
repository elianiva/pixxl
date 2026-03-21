import { SettingRow } from "./setting-row";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { Workspace } from "@pixxl/shared/schema/config";
import { useBlurSubmitInput } from "../hooks/use-blur-submit";

interface WorkspaceSettingsProps {
  workspace: Workspace;
  onUpdate: (workspace: Partial<Workspace>) => void;
}

export function WorkspaceSettings({ workspace, onUpdate }: WorkspaceSettingsProps) {
  const directoryInput = useBlurSubmitInput(workspace.directory, (directory) =>
    onUpdate({ directory }),
  );

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Workspace</h3>
      <div className="border border-border">
        <SettingRow
          label="Workspace Directory"
          description="Where projects are stored and opened from"
        >
          <Input
            value={directoryInput.localValue}
            onChange={directoryInput.handleChange}
            onBlur={directoryInput.handleBlur}
            onKeyDown={directoryInput.handleKeyDown}
            placeholder="~/Development"
          />
        </SettingRow>
        <SettingRow label="Auto-save Workspace" description="Remember open projects when closing">
          <Switch
            checked={workspace.autoSave}
            onCheckedChange={(checked) => onUpdate({ autoSave: checked })}
          />
        </SettingRow>
      </div>
    </div>
  );
}
