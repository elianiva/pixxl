import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  RiTerminalBoxLine,
  RiRobot2Line,
  RiCommandLine,
  RiAddLine,
  RiFolderOpenLine,
  RiTimeLine,
  RiRefreshLine,
  RiStackLine,
  RiFileTextLine,
  RiHashtag,
  RiLinksLine,
  RiGitCommitLine,
  RiCircleFill,
} from "@remixicon/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProjectDetail } from "@/features/project/hooks/use-project";
import { useListTerminals } from "@/features/terminal/hooks/use-terminal";
import { useListAgents } from "@/features/agent/hooks/use-agent";
import { useListCommands } from "@/features/command/hooks/use-command";
import { useCreateTerminal } from "@/features/terminal/hooks/use-terminal";
import { useCreateAgent } from "@/features/agent/hooks/use-agent";
import type { TerminalMetadata, AgentMetadata, CommandMetadata } from "@pixxl/shared";

export const Route = createFileRoute("/app/$projectId/dashboard/")({
  component: DashboardPage,
});

// Mock knowledge base data - replace with real data later
const mockNotes = [
  { id: "1", title: "Project Setup", updatedAt: new Date().toISOString(), tags: ["setup", "docs"] },
  {
    id: "2",
    title: "API Documentation",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ["api", "reference"],
  },
  {
    id: "3",
    title: "Meeting Notes",
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    tags: ["meeting"],
  },
  {
    id: "4",
    title: "Architecture Decisions",
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
    tags: ["adr", "architecture"],
  },
];

const mockTags = [
  "setup",
  "docs",
  "api",
  "reference",
  "meeting",
  "adr",
  "architecture",
  "todo",
  "bug",
  "feature",
];

const mockRecentLinks = [
  { source: "Project Setup", target: "API Documentation" },
  { source: "Architecture Decisions", target: "Project Setup" },
  { source: "Meeting Notes", target: "TODO" },
];

function DashboardPage() {
  const { projectId } = useParams({ from: "/app/$projectId/dashboard/" });
  const navigate = useNavigate();

  const projectQuery = useGetProjectDetail({ id: projectId });
  const terminalsQuery = useListTerminals({ projectId });
  const agentsQuery = useListAgents({ projectId });
  const commandsQuery = useListCommands({ projectId });

  const createTerminal = useCreateTerminal();
  const createAgent = useCreateAgent();

  const isLoading =
    projectQuery.isLoading ||
    terminalsQuery.isLoading ||
    agentsQuery.isLoading ||
    commandsQuery.isLoading;

  const project = projectQuery.data;
  const terminals = terminalsQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const commands = commandsQuery.data ?? [];

  const totalResources = terminals.length + agents.length + commands.length;

  function handleCreateTerminal() {
    const name = `Terminal ${terminals.length + 1}`;
    createTerminal.mutate({ projectId, name });
  }

  function handleCreateAgent() {
    const name = `Agent ${agents.length + 1}`;
    createAgent.mutate({ projectId, name });
  }

  function handleNavigateTerminal(terminal: TerminalMetadata) {
    void navigate({
      to: "/app/$projectId/terminal/$terminalId",
      params: { projectId, terminalId: terminal.id },
    });
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      {/* Compact Header */}
      <section className="flex items-baseline justify-between border-b border-border pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <RiFolderOpenLine className="size-3" />
            <span className="font-mono truncate max-w-[300px]">{project.path}</span>
          </div>
          <h1 className="text-lg font-heading font-medium">{project.name}</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <RiTimeLine className="size-3" />
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <RiRefreshLine className="size-3" />
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </section>

      {/* Stats Row */}
      <section className="flex gap-2">
        <StatPill icon={RiTerminalBoxLine} label="TER" value={terminals.length} />
        <StatPill icon={RiRobot2Line} label="AGT" value={agents.length} />
        <StatPill icon={RiCommandLine} label="CMD" value={commands.length} />
        <StatPill icon={RiStackLine} label="KB" value={mockNotes.length} />
      </section>

      {/* Empty State */}
      {totalResources === 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-dashed border-border">
          <div className="flex size-8 items-center justify-center bg-muted">
            <RiAddLine className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Project is empty</p>
            <p className="text-[11px] text-muted-foreground">Create resources to start working</p>
          </div>
          <div className="flex gap-2">
            <Button size="xs" onClick={handleCreateTerminal} disabled={createTerminal.isPending}>
              <RiTerminalBoxLine className="size-3.5" />
              Terminal
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={handleCreateAgent}
              disabled={createAgent.isPending}
            >
              <RiRobot2Line className="size-3.5" />
              Agent
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      {totalResources > 0 && (
        <div className="grid grid-cols-12 gap-3">
          {/* Terminals - 4 cols */}
          <Card size="sm" className="col-span-12 md:col-span-4">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiTerminalBoxLine className="size-3.5 text-muted-foreground" />
                  <CardTitle className="text-xs font-medium uppercase tracking-wider">
                    Terminals
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCreateTerminal}
                  disabled={createTerminal.isPending}
                >
                  <RiAddLine className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {terminals.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">No terminals</p>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="mt-1 h-6"
                    onClick={handleCreateTerminal}
                  >
                    Create one
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {[...terminals]
                    .sort(
                      (a: TerminalMetadata, b: TerminalMetadata) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                    )
                    .slice(0, 8)
                    .map((terminal: TerminalMetadata) => (
                      <CompactItem
                        key={terminal.id}
                        name={terminal.name}
                        meta={formatTimeAgo(terminal.updatedAt)}
                        onClick={() => handleNavigateTerminal(terminal)}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agents - 4 cols */}
          <Card size="sm" className="col-span-12 md:col-span-4">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiRobot2Line className="size-3.5 text-muted-foreground" />
                  <CardTitle className="text-xs font-medium uppercase tracking-wider">
                    Agents
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCreateAgent}
                  disabled={createAgent.isPending}
                >
                  <RiAddLine className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {agents.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">No agents</p>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="mt-1 h-6"
                    onClick={handleCreateAgent}
                  >
                    Create one
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {[...agents]
                    .sort(
                      (a: AgentMetadata, b: AgentMetadata) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                    )
                    .slice(0, 8)
                    .map((agent: AgentMetadata) => (
                      <CompactItem
                        key={agent.id}
                        name={agent.name}
                        meta={formatTimeAgo(agent.updatedAt)}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commands - 4 cols */}
          <Card size="sm" className="col-span-12 md:col-span-4">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiCommandLine className="size-3.5 text-muted-foreground" />
                  <CardTitle className="text-xs font-medium uppercase tracking-wider">
                    Commands
                  </CardTitle>
                </div>
                <span className="text-[10px] text-muted-foreground">{commands.length}</span>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {commands.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">No commands saved</p>
                  <p className="text-[10px] text-muted-foreground">Add via sidebar</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {[...commands]
                    .sort(
                      (a: CommandMetadata, b: CommandMetadata) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                    )
                    .slice(0, 6)
                    .map((command: CommandMetadata) => (
                      <div
                        key={command.id}
                        className="group px-2 py-1.5 hover:bg-muted cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium truncate">{command.name}</span>
                        </div>
                        <code className="text-[10px] text-muted-foreground font-mono truncate block">
                          {command.command}
                        </code>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Knowledge Base Section - Full Width */}
          <div className="col-span-12 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <RiStackLine className="size-3.5 text-muted-foreground" />
              <h2 className="text-xs font-medium uppercase tracking-wider">Knowledge Base</h2>
              <div className="flex-1 h-px bg-border" />
              <Button size="xs" variant="ghost" className="h-6 gap-1">
                <RiAddLine className="size-3" />
                Note
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-3">
              {/* Graph View - 3 cols */}
              <Card size="sm" className="col-span-12 md:col-span-3">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <RiLinksLine className="size-3 text-muted-foreground" />
                    <CardTitle className="text-[11px] font-medium uppercase">Graph</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="aspect-square bg-muted/30 border border-border flex items-center justify-center relative overflow-hidden">
                    {/* Simplified graph visualization */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                      {/* Nodes */}
                      <circle cx="50" cy="30" r="4" className="fill-foreground/60" />
                      <circle cx="30" cy="60" r="3" className="fill-foreground/40" />
                      <circle cx="70" cy="60" r="3" className="fill-foreground/40" />
                      <circle cx="50" cy="80" r="2" className="fill-foreground/30" />
                      {/* Edges */}
                      <line
                        x1="50"
                        y1="30"
                        x2="30"
                        y2="60"
                        className="stroke-foreground/20"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="50"
                        y1="30"
                        x2="70"
                        y2="60"
                        className="stroke-foreground/20"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="30"
                        y1="60"
                        x2="50"
                        y2="80"
                        className="stroke-foreground/20"
                        strokeWidth="0.5"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <p className="text-lg font-heading">{mockNotes.length}</p>
                      <p className="text-[10px] text-muted-foreground">notes</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{mockTags.length} tags</span>
                    <span>{mockRecentLinks.length} links</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Notes - 5 cols */}
              <Card size="sm" className="col-span-12 md:col-span-5">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <RiFileTextLine className="size-3 text-muted-foreground" />
                    <CardTitle className="text-[11px] font-medium uppercase">
                      Recent Notes
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="flex flex-col gap-1">
                    {mockNotes.map((note) => (
                      <div
                        key={note.id}
                        className="group flex items-center justify-between px-2 py-1.5 hover:bg-muted cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <RiCircleFill className="size-1.5 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate">{note.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTimeAgo(note.updatedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tags & Activity - 4 cols */}
              <Card size="sm" className="col-span-12 md:col-span-4">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <RiHashtag className="size-3 text-muted-foreground" />
                    <CardTitle className="text-[11px] font-medium uppercase">Tags</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {mockTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[10px] bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                      <RiGitCommitLine className="size-3" />
                      <span className="uppercase">Recent Activity</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <ActivityItem action="Created" target="API Documentation" time="2h ago" />
                      <ActivityItem action="Linked" target="Setup → API" time="5h ago" />
                      <ActivityItem action="Edited" target="Meeting Notes" time="1d ago" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Subcomponents

interface StatPillProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}

function StatPill({ icon: Icon, label, value }: StatPillProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card ring-1 ring-foreground/10">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

interface CompactItemProps {
  name: string;
  meta: string;
  onClick?: () => void;
}

function CompactItem({ name, meta, onClick }: CompactItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-2 py-1 text-left hover:bg-muted transition-colors group"
    >
      <span className="text-xs truncate">{name}</span>
      <span className="text-[10px] text-muted-foreground shrink-0">{meta}</span>
    </button>
  );
}

interface ActivityItemProps {
  action: string;
  target: string;
  time: string;
}

function ActivityItem({ action, target, time }: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">
        <span className="text-foreground">{action}</span> {target}
      </span>
      <span className="text-muted-foreground shrink-0">{time}</span>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 30) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DashboardSkeleton() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <section className="flex items-baseline justify-between border-b border-border pb-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-3 w-32" />
      </section>

      <section className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-20" />
        ))}
      </section>

      <div className="grid grid-cols-12 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="col-span-4">
            <Skeleton className="h-48" />
          </div>
        ))}
      </div>
    </main>
  );
}
