import { Button } from "@/components/ui/button";
import { SettingRow } from "./setting-row";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { Workspace } from "@pixxl/shared/schema/config";

interface WorkspaceSettingsProps {
  workspace: Workspace;
  onUpdate: (workspace: Partial<Workspace>) => void;
}

export function WorkspaceSettings({ workspace, onUpdate }: WorkspaceSettingsProps) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Workspace</h3>
      <div className="border border-border">
        <SettingRow
          label="Workspace Directory"
          description="Where projects are stored and opened from"
        >
          <div className="flex items-center gap-2">
            <Input
              value={workspace.directory}
              onChange={(e) => onUpdate({ directory: e.target.value })}
              placeholder="~/Development"
            />
            <Button size="sm" className="h-8">
              Browse
            </Button>
          </div>
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
