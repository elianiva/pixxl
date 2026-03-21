import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/views/components/ui/dialog";
import { SettingsSidebar } from "./sidebar";
import { WorkspaceSettings } from "./settings-workspace";
import { TerminalSettings } from "./settings-terminal";
import { AgentSettings } from "./settings-agent";
import { AppearanceSettings } from "./settings-appearance";
import { AboutSettings } from "./settings-about";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSection = "workspace" | "terminal" | "agent" | "appearance" | "about";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("workspace");
  const [workspaceDir, setWorkspaceDir] = React.useState("");
  const [terminalFontSize, setTerminalFontSize] = React.useState(14);
  const [terminalFontFamily, setTerminalFontFamily] = React.useState("JetBrains Mono");
  const [cursorStyle, setCursorStyle] = React.useState<"block" | "underline" | "bar">("block");
  const [cursorBlink, setCursorBlink] = React.useState(true);
  const [agentProvider, setAgentProvider] = React.useState("anthropic");
  const [agentModel, setAgentModel] = React.useState("claude-sonnet-4-20250514");
  const [agentName, setAgentName] = React.useState("pi");
  const [colorScheme, setColorScheme] = React.useState<"dark" | "light" | "system">("dark");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-h-125 min-w-3/5">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Customize your settings here.</DialogDescription>

        <div className="flex h-125">
          <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

          <main className="flex-1 overflow-y-auto">
            <div className="p-5">
              {activeSection === "workspace" && (
                <WorkspaceSettings workspaceDir={workspaceDir} setWorkspaceDir={setWorkspaceDir} />
              )}
              {activeSection === "terminal" && (
                <TerminalSettings
                  fontSize={terminalFontSize}
                  setFontSize={setTerminalFontSize}
                  fontFamily={terminalFontFamily}
                  setFontFamily={setTerminalFontFamily}
                  cursorStyle={cursorStyle}
                  setCursorStyle={setCursorStyle}
                  cursorBlink={cursorBlink}
                  setCursorBlink={setCursorBlink}
                />
              )}
              {activeSection === "agent" && (
                <AgentSettings
                  provider={agentProvider}
                  setProvider={setAgentProvider}
                  model={agentModel}
                  setModel={setAgentModel}
                  agentName={agentName}
                  setAgentName={setAgentName}
                />
              )}
              {activeSection === "appearance" && (
                <AppearanceSettings colorScheme={colorScheme} setColorScheme={setColorScheme} />
              )}
              {activeSection === "about" && <AboutSettings />}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
