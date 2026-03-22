import { useMemo } from "react";
import { useRouterState, useParams } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useGetProjectDetail } from "@/features/project/hooks/use-project";
import { useListAgents } from "@/features/agent/hooks/use-agent";
import { useListTerminals } from "@/features/terminal/hooks/use-terminal";

export function AppBreadcrumb() {
  const projectId = useParams({
    select: (p) => p.projectId as string,
    strict: false,
  });
  const routerState = useRouterState();
  const projectQuery = useGetProjectDetail({ id: projectId });
  const agentsQuery = useListAgents({ projectId });
  const terminalsQuery = useListTerminals({ projectId });

  const breadcrumb = useMemo(() => {
    const projectName = projectQuery.data?.name ?? "Project";
    const resolvedPath = routerState.resolvedLocation?.pathname ?? "";

    // Check route patterns
    const terminalMatch = resolvedPath.match(/\/terminal\/([^/]+)/);
    const agentMatch = resolvedPath.match(/\/agent\/([^/]+)/);
    const commandMatch = resolvedPath.match(/\/command\/([^/]+)/);

    if (terminalMatch) {
      const terminalId = terminalMatch[1];
      const terminal = terminalsQuery.data?.find((t) => t.id === terminalId);
      return {
        projectName,
        type: "Terminal" as const,
        name: terminal?.name ?? "Terminal",
      };
    }

    if (agentMatch) {
      const agentId = agentMatch[1];
      const agent = agentsQuery.data?.find((a) => a.id === agentId);
      return {
        projectName,
        type: "Agent" as const,
        name: agent?.name ?? "Agent",
      };
    }

    if (commandMatch) {
      return {
        projectName,
        type: "Command" as const,
        name: "Command",
      };
    }

    return {
      projectName,
      type: null,
      name: null,
    };
  }, [projectQuery.data, routerState.resolvedLocation, terminalsQuery.data, agentsQuery.data]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={`/app/${projectId}/dashboard`}>
            {breadcrumb.projectName}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumb.type && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbPage>{breadcrumb.type}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
        {breadcrumb.name && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
