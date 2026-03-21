import { Button } from "@/views/components/ui/button";
import { SettingRow } from "./setting-row";
import { Switch } from "@/views/components/ui/switch";
import { Input } from "@/views/components/ui/input";

interface WorkspaceSettingsProps {
  workspaceDir: string;
  setWorkspaceDir: (v: string) => void;
}

export function WorkspaceSettings(props: WorkspaceSettingsProps) {
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
              value={props.workspaceDir}
              onChange={(e) => props.setWorkspaceDir(e.target.value)}
              placeholder="~/Development"
            />
            <Button size="sm" className="h-8">
              Browse
            </Button>
          </div>
        </SettingRow>
        <SettingRow label="Auto-save Workspace" description="Remember open projects when closing">
          <Switch checked={true} onCheckedChange={() => {}} />
        </SettingRow>
      </div>
    </div>
  );
}
