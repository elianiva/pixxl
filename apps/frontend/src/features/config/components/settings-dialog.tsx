import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SettingsSidebar } from "./settings-sidebar";
import { WorkspaceSettings } from "./settings-workspace";
import { TerminalSettings } from "./settings-terminal";
import { AgentSettings } from "./settings-agent";
import { AppearanceSettings } from "./settings-appearance";
import { AboutSettings } from "./settings-about";
import { useConfig, useUpdateConfig } from "../hooks/use-config";
import { AppConfig } from "@pixxl/shared";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSection = "workspace" | "terminal" | "agent" | "appearance" | "about";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("workspace");
  const { data: config, status } = useConfig();
  const updateConfig = useUpdateConfig();

  const handleUpdate = (section: keyof AppConfig, partial: Record<string, unknown>) => {
    updateConfig.mutate({ [section]: partial } as Partial<AppConfig>);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-h-125 min-w-3/5">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Customize your settings here.</DialogDescription>

        {status === "pending" && (
          <div className="flex h-125 items-center justify-center">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex h-125 items-center justify-center">
            <span className="text-destructive">Error loading config</span>
          </div>
        )}

        {status === "success" && (
          <div className="flex h-125">
            <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
            <main className="flex-1 overflow-y-auto">
              <div className="p-5">
                {activeSection === "workspace" && (
                  <WorkspaceSettings
                    workspace={config.workspace}
                    onUpdate={(partial) => handleUpdate("workspace", partial)}
                  />
                )}
                {activeSection === "terminal" && (
                  <TerminalSettings
                    terminal={config.terminal}
                    onUpdate={(partial) => handleUpdate("terminal", partial)}
                  />
                )}
                {activeSection === "agent" && (
                  <AgentSettings
                    agent={config.agent}
                    onUpdate={(partial) => handleUpdate("agent", partial)}
                  />
                )}
                {activeSection === "appearance" && (
                  <AppearanceSettings
                    appearance={config.appearance}
                    onUpdate={(partial) => handleUpdate("appearance", partial)}
                  />
                )}
                {activeSection === "about" && <AboutSettings />}
              </div>
            </main>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
