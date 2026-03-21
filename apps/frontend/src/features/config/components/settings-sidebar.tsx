import * as React from "react";
import {
  RiFolderOpenLine,
  RiTerminalWindowLine,
  RiRobotLine,
  RiPaletteLine,
  RiInformationLine,
} from "@remixicon/react";

type SettingsSection = "workspace" | "terminal" | "agent" | "appearance" | "about";

interface NavItem {
  id: SettingsSection;
  name: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "workspace", name: "Workspace", icon: <RiFolderOpenLine className="size-4" /> },
  { id: "terminal", name: "Terminal", icon: <RiTerminalWindowLine className="size-4" /> },
  { id: "agent", name: "Agent", icon: <RiRobotLine className="size-4" /> },
  { id: "appearance", name: "Appearance", icon: <RiPaletteLine className="size-4" /> },
  { id: "about", name: "About", icon: <RiInformationLine className="size-4" /> },
];

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export function SettingsSidebar(props: SettingsSidebarProps) {
  return (
    <nav className="w-48 border-r border-border shrink-0">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold">Settings</h2>
      </div>
      <div className="p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => props.onSectionChange(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              props.activeSection === item.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {item.icon}
            {item.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
