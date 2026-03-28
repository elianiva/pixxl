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
  RiCircleFill,
} from "@remixicon/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveQuery } from "@tanstack/react-db";
import { getAgentsCollection } from "@/features/agent/agents-collection";
import { getTerminalsCollection } from "@/features/terminal/terminals-collection";
import { getCommandsCollection } from "@/features/command/commands-collection";
import { generateId } from "@/lib/utils";
import type { TerminalMetadata } from "@pixxl/shared";

export const Route = createFileRoute("/app/$projectId/dashboard/")({
  component: DashboardPage,
});

// TODO: These should come from a KnowledgeBase collection
const mockNotes = [
  { id: "1", title: "Project Setup", updatedAt: new Date().toISOString() },
  { id: "2", title: "API Documentation", updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "3", title: "Meeting Notes", updatedAt: new Date(Date.now() - 172800000).toISOString() },
  {
    id: "4",
    title: "Architecture Decisions",
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
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

function DashboardPage() {
  const { projectId } = useParams({ from: "/app/$projectId/dashboard/" });
  const navigate = useNavigate();

  const agentsCollection = getAgentsCollection(projectId);
  const terminalsCollection = getTerminalsCollection(projectId);
  const commandsCollection = getCommandsCollection(projectId);

  // Single queries per collection - derive counts and limited lists from same source
  const terminals = useLiveQuery((q) =>
    q.from({ terminal: terminalsCollection }).orderBy(({ terminal }) => terminal.updatedAt, "desc"),
  );
  const agents = useLiveQuery((q) =>
    q.from({ agent: agentsCollection }).orderBy(({ agent }) => agent.updatedAt, "desc"),
  );
  const commands = useLiveQuery((q) =>
    q.from({ command: commandsCollection }).orderBy(({ command }) => command.updatedAt, "desc"),
  );

  const isLoading = terminals.isLoading || agents.isLoading || commands.isLoading;
  const terminalData = terminals.data ?? [];
  const agentData = agents.data ?? [];
  const commandData = commands.data ?? [];
  const totalResources = terminalData.length + agentData.length + commandData.length;

  function handleCreateTerminal() {
    terminalsCollection.insert({
      id: generateId(),
      name: `Terminal ${terminalData.length + 1}`,
      themeId: "catppuccin-mocha",
      fontId: "jetbrains-mono",
      fontSize: 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleCreateAgent() {
    agentsCollection.insert({
      id: generateId(),
      projectId,
      name: `Agent ${agentData.length + 1}`,
      pi: { sessionFile: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleNavigateTerminal(terminal: TerminalMetadata) {
    void navigate({
      to: "/app/$projectId/terminal/$terminalId",
      params: { projectId, terminalId: terminal.id },
    });
  }

  if (isLoading) return <DashboardSkeleton />;

  return (
    <main className="flex flex-col gap-4 p-4 pt-16">
      <section className="flex items-baseline justify-between border-b border-border pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <RiFolderOpenLine className="size-3" />
            <span className="font-mono truncate max-w-75">{projectId}</span>
          </div>
          <h1 className="text-lg font-heading font-medium">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <RiTimeLine className="size-3" />
            now
          </span>
          <span className="flex items-center gap-1">
            <RiRefreshLine className="size-3" />
            live
          </span>
        </div>
      </section>

      <section className="flex gap-2">
        <StatPill icon={RiTerminalBoxLine} label="TERMINALS" value={terminalData.length} />
        <StatPill icon={RiRobot2Line} label="AGENTS" value={agentData.length} />
        <StatPill icon={RiCommandLine} label="COMANDS" value={commandData.length} />
        <StatPill icon={RiStackLine} label="KNOWLEDGE" value={mockNotes.length} />
      </section>

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
            <Button size="xs" onClick={handleCreateTerminal}>
              <RiTerminalBoxLine className="size-3.5" />
              Terminal
            </Button>
            <Button size="xs" variant="outline" onClick={handleCreateAgent}>
              <RiRobot2Line className="size-3.5" />
              Agent
            </Button>
          </div>
        </div>
      )}

      {totalResources > 0 && (
        <div className="grid grid-cols-12 gap-3">
          <Card size="sm" className="col-span-12 md:col-span-4">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiTerminalBoxLine className="size-3.5 text-muted-foreground" />
                  <CardTitle className="text-xs font-medium uppercase tracking-wider">
                    Terminals
                  </CardTitle>
                </div>
                <Button variant="ghost" size="icon-xs" onClick={handleCreateTerminal}>
                  <RiAddLine className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {terminalData.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">No terminals</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {terminalData.map((terminal) => (
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

          <Card size="sm" className="col-span-12 md:col-span-4">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiRobot2Line className="size-3.5 text-muted-foreground" />
                  <CardTitle className="text-xs font-medium uppercase tracking-wider">
                    Agents
                  </CardTitle>
                </div>
                <Button variant="ghost" size="icon-xs" onClick={handleCreateAgent}>
                  <RiAddLine className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {agentData.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">No agents</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {agentData.map((agent) => (
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

          <Card size="sm" className="col-span-12 md:col-span-4">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiCommandLine className="size-3.5 text-muted-foreground" />
                  <CardTitle className="text-xs font-medium uppercase tracking-wider">
                    Commands
                  </CardTitle>
                </div>
                <span className="text-[10px] text-muted-foreground">{commandData.length}</span>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {commandData.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">No commands saved</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {commandData.map((cmd) => (
                    <div key={cmd.id} className="group px-2 py-1.5 hover:bg-muted cursor-pointer">
                      <span className="text-xs font-medium truncate block">{cmd.name}</span>
                      <code className="text-[10px] text-muted-foreground font-mono truncate block">
                        {cmd.command}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
              <Card size="sm" className="col-span-12 md:col-span-3">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <RiLinksLine className="size-3 text-muted-foreground" />
                    <CardTitle className="text-[11px] font-medium uppercase">Graph</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="aspect-square bg-muted/30 border border-border flex items-center justify-center">
                    <p className="text-lg font-heading">{mockNotes.length}</p>
                  </div>
                </CardContent>
              </Card>
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
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-muted cursor-pointer"
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card ring-1 ring-foreground/10">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function CompactItem({
  name,
  meta,
  onClick,
}: {
  name: string;
  meta: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-2 py-1 text-left hover:bg-muted transition-colors"
    >
      <span className="text-xs truncate">{name}</span>
      <span className="text-[10px] text-muted-foreground shrink-0">{meta}</span>
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
