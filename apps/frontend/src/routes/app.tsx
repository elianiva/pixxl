import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { Separator } from "@base-ui/react";
import { useListAgents } from "@/features/agent/hooks/use-agent";
import { useDeleteAgent } from "@/features/agent/hooks/use-agent";
import { useListTerminals } from "@/features/terminal/hooks/use-terminal";
import { useDeleteTerminal } from "@/features/terminal/hooks/use-terminal";
import { useDeleteCommand } from "@/features/command/hooks/use-command";
import { NewCommandDialog } from "@/features/command/components/new-command-dialog";
import { EditAgentDialog } from "@/features/agent/components/edit-agent-dialog";
import { EditTerminalDialog } from "@/features/terminal/components/edit-terminal-dialog";
import type { AgentMetadata, CommandMetadata, TerminalMetadata } from "@pixxl/shared";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

function RouteComponent() {
  const projectId = useParams({
    // this should be safe as this is a shell route, user will always be at least in /$projectId/
    select: (p) => p.projectId as string,
    strict: false,
  });
  const navigate = useNavigate();
  const agentsQuery = useListAgents({ projectId: projectId });
  const terminalsQuery = useListTerminals({ projectId: projectId });
  const deleteAgent = useDeleteAgent();
  const deleteTerminal = useDeleteTerminal();
  const deleteCommand = useDeleteCommand();

  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentMetadata | null>(null);
  const [editingTerminal, setEditingTerminal] = useState<TerminalMetadata | null>(null);

  function handleNavigateTerminal(terminal: TerminalMetadata) {
    void navigate({
      to: "/app/$projectId/terminal/$terminalId",
      params: { projectId: projectId, terminalId: terminal.id },
    });
  }

  function handleDeleteAgent(agent: AgentMetadata) {
    deleteAgent.mutate({ projectId: projectId, id: agent.id });
  }

  function handleDeleteTerminal(terminal: TerminalMetadata) {
    deleteTerminal.mutate({ projectId: projectId, id: terminal.id });
  }

  function handleDeleteCommand(command: CommandMetadata) {
    deleteCommand.mutate({ projectId: projectId, id: command.id });
  }

  return (
    <SidebarProvider>
      <AppSidebar
        projectId={projectId}
        agents={[...(agentsQuery.data ?? [])]}
        terminals={[...(terminalsQuery.data ?? [])]}
        isAgentsLoading={agentsQuery.isLoading}
        isTerminalsLoading={terminalsQuery.isLoading}
        onEditAgent={setEditingAgent}
        onEditTerminal={setEditingTerminal}
        onDeleteAgent={handleDeleteAgent}
        onDeleteTerminal={handleDeleteTerminal}
        onDeleteCommand={handleDeleteCommand}
        onAddCommand={setCommandDialogOpen.bind(null, true)}
        onNavigateTerminal={handleNavigateTerminal}
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
        projectId={projectId}
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
      <EditAgentDialog
        agent={editingAgent}
        open={editingAgent !== null}
        onOpenChange={(open) => !open && setEditingAgent(null)}
      />
      <EditTerminalDialog
        terminal={editingTerminal}
        open={editingTerminal !== null}
        onOpenChange={(open) => !open && setEditingTerminal(null)}
      />
    </SidebarProvider>
  );
}
