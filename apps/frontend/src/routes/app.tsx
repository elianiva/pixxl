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
import { NewAgentDialog } from "@/features/agent/components/new-agent-dialog";
import { NewTerminalDialog } from "@/features/terminal/components/new-terminal-dialog";
import { NewCommandDialog } from "@/features/command/components/new-command-dialog";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

function RouteComponent() {
  const projectId = useParams({ from: "/app/$projectId/" }).projectId;
  const agentsQuery = useListAgents({ projectId });
  const terminalsQuery = useListTerminals({ projectId });

  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);

  return (
    <SidebarProvider>
      <AppSidebar
        _projectId={projectId}
        agents={[...(agentsQuery.data ?? [])]}
        terminals={[...(terminalsQuery.data ?? [])]}
        isAgentsLoading={agentsQuery.isLoading}
        isTerminalsLoading={terminalsQuery.isLoading}
        onAddAgent={() => setAgentDialogOpen(true)}
        onAddTerminal={() => setTerminalDialogOpen(true)}
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

      <NewAgentDialog
        projectId={projectId}
        open={agentDialogOpen}
        onOpenChange={setAgentDialogOpen}
      />
      <NewTerminalDialog
        projectId={projectId}
        open={terminalDialogOpen}
        onOpenChange={setTerminalDialogOpen}
      />
      <NewCommandDialog
        projectId={projectId}
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
    </SidebarProvider>
  );
}
