import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SettingsSidebar } from "./settings-sidebar";
import { WorkspaceSettings } from "./settings-workspace";
import { TerminalSettings } from "./settings-terminal";
import { AgentSettings } from "./settings-agent";
import { AppearanceSettings } from "./settings-appearance";
import { AboutSettings } from "./settings-about";
import { useConfig, useUpdateConfig, useAgentFrontendConfig } from "../hooks/use-config";
import { AppConfig } from "@pixxl/shared";

type ConfigDomainError = {
  _tag: "ConfigParseError" | "ConfigSerializeError";
  message: string;
  details?: string;
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSection = "workspace" | "terminal" | "agent" | "appearance" | "about";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asConfigDomainError(value: unknown): ConfigDomainError | null {
  if (!isRecord(value)) {
    return null;
  }

  const tag = value._tag;
  const message = value.message;
  const details = value.details;

  if (tag !== "ConfigParseError" && tag !== "ConfigSerializeError") {
    return null;
  }

  if (typeof message !== "string") {
    return null;
  }

  return {
    _tag: tag,
    message,
    details: typeof details === "string" ? details : undefined,
  };
}

function findConfigDomainError(value: unknown, depth = 0): ConfigDomainError | null {
  if (depth > 6) {
    return null;
  }

  const direct = asConfigDomainError(value);
  if (direct) {
    return direct;
  }

  if (!isRecord(value)) {
    return null;
  }

  const likelyNestedKeys = ["data", "error", "cause", "value", "payload", "issues"];
  for (const key of likelyNestedKeys) {
    if (key in value) {
      const nested = findConfigDomainError(value[key], depth + 1);
      if (nested) {
        return nested;
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nested = findConfigDomainError(nestedValue, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function getErrorMessage(error: unknown, fallback: string): { message: string; details?: string } {
  const domainError = findConfigDomainError(error);
  if (domainError) {
    return { message: domainError.message, details: domainError.details };
  }

  if (error instanceof Error && error.message) {
    return { message: fallback, details: error.message };
  }

  return { message: fallback };
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("workspace");
  const [dismissedError, setDismissedError] = React.useState<string | null>(null);
  const { data: config, status, error: loadError } = useConfig();
  const { data: agentFrontendConfig } = useAgentFrontendConfig();
  const updateConfig = useUpdateConfig();

  const handleUpdate = (section: keyof AppConfig, partial: Record<string, unknown>) => {
    updateConfig.mutate({ [section]: partial } as Partial<AppConfig>);
  };

  const activeError = updateConfig.error ?? loadError;
  const errorInfo =
    activeError === null || activeError === undefined
      ? null
      : getErrorMessage(
          activeError,
          status === "error" ? "Error loading config" : "Error saving config",
        );

  // Auto-dismiss error after 5 seconds
  React.useEffect(() => {
    if (!errorInfo) {
      setDismissedError(null);
      return;
    }

    const errorKey = `${errorInfo.message}-${errorInfo.details ?? ""}`;
    if (dismissedError === errorKey) return;

    const timer = setTimeout(() => {
      setDismissedError(errorKey);
    }, 5000);

    return () => clearTimeout(timer);
  }, [errorInfo, dismissedError]);

  const isErrorDismissed = errorInfo
    ? dismissedError === `${errorInfo.message}-${errorInfo.details ?? ""}`
    : false;

  const handleDismissError = () => {
    if (errorInfo) {
      setDismissedError(`${errorInfo.message}-${errorInfo.details ?? ""}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-h-125 min-w-3/5">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Customize your settings here.</DialogDescription>

        <div className="flex h-125 flex-col">
          <div className="min-h-0 flex-1">
            {status === "pending" && (
              <div className="flex h-full items-center justify-center">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex h-full items-center justify-center">
                <span className="text-destructive">Error loading config</span>
              </div>
            )}

            {status === "success" && (
              <div className="flex h-full">
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
                        availableModels={agentFrontendConfig?.availableModels ?? []}
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
          </div>

          {errorInfo && !isErrorDismissed && (
            <div className="border-t bg-destructive/5 px-5 py-3 flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{errorInfo.message}</p>
                {errorInfo.details && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {errorInfo.details}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDismissError}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
