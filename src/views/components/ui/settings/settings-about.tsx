import { SettingRow } from "./setting-row";

export function AboutSettings() {
  return (
    <div>
      <h3 className="text-base font-semibold mb-4">About</h3>
      <div className="border border-border">
        <SettingRow label="Version">
          <span className="text-sm text-muted-foreground">0.1.0</span>
        </SettingRow>
        <SettingRow label="Lorem">
          <span className="text-sm text-muted-foreground">Lorem Ipsum</span>
        </SettingRow>
      </div>
    </div>
  );
}
