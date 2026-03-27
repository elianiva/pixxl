"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SettingRow } from "@/features/config/components/setting-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RiSettings3Line,
  RiFileListLine,
  RiLoader4Line,
  RiFileCopyLine,
  RiCheckLine,
} from "@remixicon/react";
import { useMutation } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import type { AgentThinkingLevel } from "@pixxl/shared";
import type { ModelOption } from "./model-selector";
import { AgentModelSettings } from "./agent-model-settings";
import { SessionTreeView } from "./session-tree-view";
import { useAgentActions, useModels } from "../hooks";

type SessionSection = "settings" | "session";

interface NavItem {
  id: SessionSection;
  name: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "settings", name: "Settings", icon: <RiSettings3Line className="size-4" /> },
  { id: "session", name: "Session", icon: <RiFileListLine className="size-4" /> },
];

interface SessionSidebarProps {
  activeSection: SessionSection;
  onSectionChange: (section: SessionSection) => void;
}

function SessionSidebar({ activeSection, onSectionChange }: SessionSidebarProps) {
  return (
    <nav className="w-48 border-r border-border shrink-0">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold">Session</h2>
      </div>
      <div className="p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${activeSection === item.id
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

const formatCompact = (n: number): string => {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
};

const formatPath = (path: string): string => {
  const parts = path.split("/");
  return parts.length > 3 ? `.../${parts.slice(-3).join("/")}` : path;
};

interface AgentSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  projectId: string;
  currentModel: ModelOption | undefined;
  currentThinkingLevel: AgentThinkingLevel;
  onModelChange: (model: ModelOption) => void;
  onThinkingLevelChange: (level: AgentThinkingLevel) => void;
}

export function AgentSessionDialog({
  open,
  onOpenChange,
  agentId,
  projectId,
  currentModel,
  currentThinkingLevel,
  onModelChange,
  onThinkingLevelChange,
}: AgentSessionDialogProps) {
  const [activeSection, setActiveSection] = React.useState<SessionSection>("settings");
  const queryClient = useQueryClient();

  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["agent-session-details", projectId, agentId],
    queryFn: () => rpc.agent.getAgentSessionDetails({ projectId, agentId }),
    enabled: open,
  });

  const { data: attachableSessions } = useQuery({
    queryKey: ["attachable-sessions", projectId],
    queryFn: () => rpc.agent.listAttachableSessions({ projectId }),
    enabled: open && activeSection === "settings",
  });

  const { configureSession } = useAgentActions(projectId, agentId);

  const switchSessionMutation = useMutation({
    mutationFn: ({ sessionFile }: { sessionFile: string }) =>
      rpc.agent.switchSession({ projectId, agentId, sessionFile }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-session-details", projectId, agentId] });
      queryClient.invalidateQueries({ queryKey: ["agent-runtime", projectId, agentId] });
      queryClient.invalidateQueries({ queryKey: ["agent-history", projectId, agentId] });
    },
  });

  const allModels = useModels();

  const [copied, setCopied] = React.useState(false);

  const handleThinkingLevelChange = (level: AgentThinkingLevel) => {
    onThinkingLevelChange(level);
    if (currentModel) {
      void configureSession(agentId, { model: currentModel, thinkingLevel: level });
    }
  };

  const handleCopyPath = React.useCallback(() => {
    if (!details?.sessionFile) return;
    void navigator.clipboard.writeText(details.sessionFile);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [details?.sessionFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-h-125 min-w-3/5">
        <DialogTitle className="sr-only">Session Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Configure agent session settings and view session details.
        </DialogDescription>

        <div className="flex h-125 flex-col">
          <div className="min-h-0 flex-1">
            <div className="flex h-full">
              <SessionSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
              <main className="flex-1 overflow-y-auto">
                <div className="p-5">
                  {activeSection === "settings" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-4 text-base font-semibold">Model Settings</h3>
                        <AgentModelSettings
                          provider={currentModel?.provider ?? ""}
                          model={currentModel?.id ?? ""}
                          thinkingLevel={currentThinkingLevel}
                          onProviderChange={(provider) => {
                            if (!currentModel) return;
                            onModelChange({ ...currentModel, provider });
                          }}
                          onModelChange={(modelId) => {
                            if (!currentModel) return;
                            const modelData = allModels.find((m) => m.id === modelId);
                            if (modelData) {
                              onModelChange({
                                id: modelData.id,
                                provider: modelData.provider,
                                name: modelData.name,
                                fullId: modelData.fullId,
                              });
                            }
                            void configureSession(agentId, {
                              model: {
                                id: modelId,
                                provider: currentModel?.provider ?? "",
                                name: currentModel?.name ?? "",
                              },
                              thinkingLevel: currentThinkingLevel,
                            });
                          }}
                          onThinkingLevelChange={handleThinkingLevelChange}
                        />
                      </div>

                      {(details || attachableSessions?.length) && (
                        <div>
                          <h3 className="mb-4 text-base font-semibold">Session</h3>
                          <div className="border border-border">
                            {details && (
                              <SettingRow
                                label="Current Session"
                                description="Path to the current session file"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCopyPath}
                                  disabled={copied}
                                  type="button"
                                >
                                  {copied ? (
                                    <>
                                      <RiCheckLine className="size-4 mr-1.5" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <RiFileCopyLine className="size-4 mr-1.5" />
                                      Copy path
                                    </>
                                  )}
                                </Button>
                              </SettingRow>
                            )}
                            {attachableSessions && attachableSessions.length > 0 && (
                              <SettingRow
                                label="Switch Session"
                                description="Attach to a different session"
                              >
                                <Select
                                  onValueChange={(sessionFile: string | null) => {
                                    if (sessionFile) {
                                      switchSessionMutation.mutate({ sessionFile });
                                    }
                                  }}
                                  disabled={switchSessionMutation.isPending}
                                >
                                  <SelectTrigger className="w-52">
                                    <SelectValue placeholder="Select session..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {attachableSessions.map((session) => (
                                      <SelectItem key={session.id} value={session.path}>
                                        {session.name || session.id}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </SettingRow>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === "session" && (
                    <div className="space-y-6">
                      <h3 className="text-base font-semibold">Session Overview</h3>

                      {isLoadingDetails && (
                        <div className="flex items-center justify-center py-8">
                          <RiLoader4Line className="size-5 animate-spin text-muted-foreground" />
                        </div>
                      )}

                      {!isLoadingDetails && !details && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Session details not available
                        </div>
                      )}

                      {details && (
                        <>
                          <div className="border border-border">
                            <SettingRow label="Session ID">
                              <span className="text-xs font-mono text-muted-foreground">
                                {details.sessionId.slice(0, 8)}...
                              </span>
                            </SettingRow>
                            {details.sessionName && (
                              <SettingRow label="Session Name">
                                <span className="text-xs text-muted-foreground">
                                  {details.sessionName}
                                </span>
                              </SettingRow>
                            )}
                            <SettingRow label="Working Directory">
                              <span className="text-xs font-mono text-muted-foreground truncate max-w-50">
                                {formatPath(details.cwd)}
                              </span>
                            </SettingRow>
                            {details.createdAt && (
                              <SettingRow label="Created">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(details.createdAt).toLocaleDateString()}
                                </span>
                              </SettingRow>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-3">Statistics</h4>
                            <div className="border border-border">
                              <SettingRow label="Total Tokens">
                                <span className="tabular-nums text-sm">
                                  {formatCompact(details.stats.totalTokens)}
                                </span>
                              </SettingRow>
                              <SettingRow label="Messages">
                                <span className="tabular-nums text-sm">
                                  {details.stats.messageCount}
                                </span>
                              </SettingRow>
                              <SettingRow label="Tool Calls">
                                <span className="tabular-nums text-sm">
                                  {details.stats.toolCallCount}
                                </span>
                              </SettingRow>
                              <SettingRow label="Total Cost">
                                <span className="tabulas-nums text-sm font-mono">
                                  ${details.stats.totalCost.toFixed(3)}
                                </span>
                              </SettingRow>
                            </div>
                          </div>

                          {details.tree.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-3">Session Tree</h4>
                              <ScrollArea className="h-50">
                                <SessionTreeView nodes={details.tree} leafId={details.leafId} />
                              </ScrollArea>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
