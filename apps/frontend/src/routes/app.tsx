import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { Separator } from "@base-ui/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useListAgents } from "@/features/agent/hooks/use-agent";
import { useListTerminals } from "@/features/terminal/hooks/use-terminal";
import { NewCommandDialog } from "@/features/command/components/new-command-dialog";
import { EditAgentDialog } from "@/features/agent/components/edit-agent-dialog";
import { EditTerminalDialog } from "@/features/terminal/components/edit-terminal-dialog";
import type { AgentMetadata, TerminalMetadata } from "@pixxl/shared";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

function RouteComponent() {
  const projectId = useParams({ from: "/app/$projectId/" }).projectId;
  const agentsQuery = useListAgents({ projectId });
  const terminalsQuery = useListTerminals({ projectId });

  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentMetadata | null>(null);
  const [editingTerminal, setEditingTerminal] = useState<TerminalMetadata | null>(null);

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
        onAddCommand={() => setCommandDialogOpen(true)}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
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
