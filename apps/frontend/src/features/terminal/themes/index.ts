import type { ITheme } from "ghostty-web";

import { githubDark } from "./github-dark";
import { githubDarkDimmed } from "./github-dark-dimmed";
import { githubDarkHighContrast } from "./github-dark-high-contrast";
import { githubLight } from "./github-light";
import { catppuccinFrappe } from "./catppuccin-frappe";
import { catppuccinLatte } from "./catppuccin-latte";
import { catppuccinMacchiato } from "./catppuccin-macchiato";
import { catppuccinMocha } from "./catppuccin-mocha";
import { rosePine } from "./rose-pine";
import { rosePineDawn } from "./rose-pine-dawn";
import { rosePineMoon } from "./rose-pine-moon";

export type TerminalTheme = {
  id: string;
  name: string;
  theme: ITheme;
  isDark: boolean;
};

export const terminalThemes: TerminalTheme[] = [
  // GitHub themes
  { id: "github-dark", name: "GitHub Dark", theme: githubDark, isDark: true },
  { id: "github-dark-dimmed", name: "GitHub Dark Dimmed", theme: githubDarkDimmed, isDark: true },
  { id: "github-dark-high-contrast", name: "GitHub Dark High Contrast", theme: githubDarkHighContrast, isDark: true },
  { id: "github-light", name: "GitHub Light", theme: githubLight, isDark: false },

  // Catppuccin themes
  { id: "catppuccin-frappe", name: "Catppuccin Frappé", theme: catppuccinFrappe, isDark: true },
  { id: "catppuccin-macchiato", name: "Catppuccin Macchiato", theme: catppuccinMacchiato, isDark: true },
  { id: "catppuccin-mocha", name: "Catppuccin Mocha", theme: catppuccinMocha, isDark: true },
  { id: "catppuccin-latte", name: "Catppuccin Latte", theme: catppuccinLatte, isDark: false },

  // Rosé Pine themes
  { id: "rose-pine", name: "Rosé Pine", theme: rosePine, isDark: true },
  { id: "rose-pine-moon", name: "Rosé Pine Moon", theme: rosePineMoon, isDark: true },
  { id: "rose-pine-dawn", name: "Rosé Pine Dawn", theme: rosePineDawn, isDark: false },
];

export type TerminalFont = {
  id: string;
  name: string;
  family: string;
};

export const terminalFonts: TerminalFont[] = [
  { id: "jetbrains-mono", name: "JetBrains Mono", family: "'JetBrains Mono Variable', monospace" },
  { id: "lilex", name: "Lilex", family: "'Lilex Variable', monospace" },
  { id: "iosevka", name: "Iosevka", family: "'Iosevka', monospace" },
];

// Re-export theme objects for direct import
export {
  githubDark,
  githubDarkDimmed,
  githubDarkHighContrast,
  githubLight,
  catppuccinFrappe,
  catppuccinLatte,
  catppuccinMacchiato,
  catppuccinMocha,
  rosePine,
  rosePineDawn,
  rosePineMoon,
};
