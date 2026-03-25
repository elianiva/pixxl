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
import { EditAgentDialog } from "@/features/agent/components/edit-agent-dialog";
import { EditTerminalDialog } from "@/features/terminal/components/edit-terminal-dialog";
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
  const agents = useLiveQuery(projectId ? getAgentsCollection(projectId) : null);
  const terminals = useLiveQuery(projectId ? getTerminalsCollection(projectId) : null);
  const commands = useLiveQuery(projectId ? getCommandsCollection(projectId) : null);

  function handleSelectProject(project: { id: string }) {
    void navigate({
      to: "/app/$projectId",
      params: { projectId: project.id },
    });
  }

  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
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
      name,
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
        onEditAgent={setEditingAgent}
        onEditTerminal={setEditingTerminal}
        onDeleteAgent={handleDeleteAgent}
        onDeleteTerminal={handleDeleteTerminal}
        onDeleteCommand={handleDeleteCommand}
        onAddCommand={() => setCommandDialogOpen(true)}
        onCreateAgent={handleCreateAgent}
        onCreateTerminal={handleCreateTerminal}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <AppBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-screen flex-1 md:min-h-min">
            <Outlet />
          </div>
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
    </SidebarProvider>
  );
}
