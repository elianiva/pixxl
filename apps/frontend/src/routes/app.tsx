import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { Separator } from "@base-ui/react";
import { useLiveQuery } from "@tanstack/react-db";
import { getAgentsCollection } from "@/features/agent/agents-collection";
import { getTerminalsCollection } from "@/features/terminal/terminals-collection";
import { getCommandsCollection } from "@/features/command/commands-collection";
import { projectsCollection } from "@/features/project/projects-collection";
import { NewCommandDialog } from "@/features/command/components/new-command-dialog";
import { NewProjectDialog } from "@/features/project/components/new-project-dialog";
import { EditAgentDialog } from "@/features/agent/components/dialog/edit-agent";
import { EditTerminalDialog } from "@/features/terminal/components/edit-terminal-dialog";
import { SettingsDialog } from "@/features/config/components/settings-dialog";
import type { AgentMetadata, TerminalMetadata, CommandMetadata } from "@pixxl/shared";
import { generateId } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

function RouteComponent() {
  const projectId = useParams({ select: (p) => p.projectId as string, strict: false });
  const navigate = useNavigate();

  const projects = useLiveQuery(projectsCollection);

  // Get project-scoped collections dynamically based on projectId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents = useLiveQuery(projectId ? getAgentsCollection(projectId) : (null as any));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const terminals = useLiveQuery(projectId ? getTerminalsCollection(projectId) : (null as any));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commands = useLiveQuery(projectId ? getCommandsCollection(projectId) : (null as any));

  function handleSelectProject(project: { id: string }) {
    void navigate({
      to: "/app/$projectId",
      params: { projectId: project.id },
    });
  }

  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentMetadata | null>(null);
  const [editingTerminal, setEditingTerminal] = useState<TerminalMetadata | null>(null);

  function handleCreateProject(name: string) {
    if (!projects.collection) return;
    projectsCollection.insert({
      id: generateId(),
      name,
      path: `/projects/${name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleCreateAgent(name: string) {
    if (!projectId) return;
    getAgentsCollection(projectId).insert({
      id: generateId(),
      projectId,
      name,
      pi: { sessionFile: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleUpdateAgent(id: string, name: string) {
    if (!projectId) return;
    // Draft is mutable proxy, don't type it with readonly schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAgentsCollection(projectId).update(id, (draft: any) => {
      draft.name = name;
      draft.updatedAt = new Date().toISOString();
    });
  }

  function handleDeleteAgent(id: string) {
    if (!projectId) return;
    getAgentsCollection(projectId).delete(id);
  }

  function handleCreateTerminal(name: string) {
    if (!projectId) return;
    getTerminalsCollection(projectId).insert({
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleUpdateTerminal(id: string, name: string) {
    if (!projectId) return;
    // Draft is mutable proxy, don't type it with readonly schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getTerminalsCollection(projectId).update(id, (draft: any) => {
      draft.name = name;
      draft.updatedAt = new Date().toISOString();
    });
  }

  function handleDeleteTerminal(id: string) {
    if (!projectId) return;
    getTerminalsCollection(projectId).delete(id);
  }

  function handleCreateCommand(input: { name: string; command: string; description?: string }) {
    if (!projectId) return;
    getCommandsCollection(projectId).insert({
      id: generateId(),
      name: input.name,
      command: input.command,
      description: input.description ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleDeleteCommand(id: string) {
    if (!projectId) return;
    getCommandsCollection(projectId).delete(id);
  }

  return (
    <SidebarProvider>
      <AppSidebar
        projects={projects.data ?? []}
        currentProjectId={projectId}
        agents={(agents.data ?? []) as AgentMetadata[]}
        terminals={(terminals.data ?? []) as TerminalMetadata[]}
        commands={(commands.data ?? []) as CommandMetadata[]}
        isLoading={agents.isLoading || terminals.isLoading}
        onSelectProject={handleSelectProject}
        onAddProject={() => setProjectDialogOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        actions={{
          agents: {
            edit: setEditingAgent,
            delete: handleDeleteAgent,
            create: handleCreateAgent,
          },
          terminals: {
            edit: setEditingTerminal,
            delete: handleDeleteTerminal,
            create: handleCreateTerminal,
          },
          commands: {
            add: () => setCommandDialogOpen(true),
            delete: handleDeleteCommand,
          },
        }}
      />
      <SidebarInset className="h-svh flex flex-col">
        <header className="flex-none bg-background flex h-14 w-full items-center gap-2 border-b z-10">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <AppBreadcrumb />
          </div>
        </header>
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </SidebarInset>

      <NewCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
        onCreate={handleCreateCommand}
      />
      <NewProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onCreate={handleCreateProject}
      />
      <EditAgentDialog
        agent={editingAgent}
        open={editingAgent !== null}
        onOpenChange={(open) => !open && setEditingAgent(null)}
        onUpdate={handleUpdateAgent}
      />
      <EditTerminalDialog
        terminal={editingTerminal}
        open={editingTerminal !== null}
        onOpenChange={(open) => !open && setEditingTerminal(null)}
        onUpdate={handleUpdateTerminal}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </SidebarProvider>
  );
}
