import { getBuiltinTheme } from "restty";

export type TerminalTheme = {
  id: string;
  name: string;
  builtinName: string;
  isDark: boolean;
};

export const terminalThemes: TerminalTheme[] = [
  { id: "github-dark", name: "GitHub Dark", builtinName: "GitHub Dark", isDark: true },
  { id: "github-dark-dimmed", name: "GitHub Dark Dimmed", builtinName: "GitHub Dark Dimmed", isDark: true },
  { id: "github-dark-high-contrast", name: "GitHub Dark High Contrast", builtinName: "GitHub Dark High Contrast", isDark: true },
  { id: "github-light", name: "GitHub Light", builtinName: "GitHub Light", isDark: false },
  { id: "catppuccin-frappe", name: "Catppuccin Frappé", builtinName: "Catppuccin Frappé", isDark: true },
  { id: "catppuccin-macchiato", name: "Catppuccin Macchiato", builtinName: "Catppuccin Macchiato", isDark: true },
  { id: "catppuccin-mocha", name: "Catppuccin Mocha", builtinName: "Catppuccin Mocha", isDark: true },
  { id: "catppuccin-latte", name: "Catppuccin Latte", builtinName: "Catppuccin Latte", isDark: false },
  { id: "rose-pine", name: "Rosé Pine", builtinName: "Rosé Pine", isDark: true },
  { id: "rose-pine-moon", name: "Rosé Pine Moon", builtinName: "Rosé Pine Moon", isDark: true },
  { id: "rose-pine-dawn", name: "Rosé Pine Dawn", builtinName: "Rosé Pine Dawn", isDark: false },
];

export type TerminalFont = {
  id: string;
  name: string;
  matchers: string[];
};

export const terminalFonts: TerminalFont[] = [
  { id: "jetbrains-mono", name: "JetBrains Mono", matchers: ["JetBrains Mono Variable", "JetBrains Mono", "jetbrains mono nerd font"] },
  { id: "lilex", name: "Lilex", matchers: ["Lilex Variable", "Lilex", "lilex nerd font"] },
  { id: "iosevka", name: "Iosevka", matchers: ["Iosevka", "Iosevka Nerd Font", "iosevka nerd font"] },
];

export function getTerminalTheme(themeId: string) {
  const theme = terminalThemes.find((entry) => entry.id === themeId) ?? terminalThemes[0];
  return getBuiltinTheme(theme.builtinName) ?? null;
}

export function getTerminalFontSources(fontId: string) {
  const font = terminalFonts.find((entry) => entry.id === fontId) ?? terminalFonts[0];
  return [{ type: "local", matchers: font.matchers, required: true }];
}
