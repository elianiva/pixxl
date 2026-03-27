import { useMemo } from "react";
import { useRouterState, useParams } from "@tanstack/react-router";
import { eq } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getTerminalsCollection } from "@/features/terminal/terminals-collection";
import { getAgentsCollection } from "@/features/agent";

export function AppBreadcrumb() {
  const projectId = useParams({ select: (p) => p.projectId as string, strict: false });
  const routerState = useRouterState();
  const resolvedPath = routerState.resolvedLocation?.pathname ?? "";

  const terminalMatch = resolvedPath.match(/\/terminal\/([^/]+)/);
  const agentMatch = resolvedPath.match(/\/agent\/([^/]+)/);

  const terminalId = terminalMatch?.[1];
  const agentId = agentMatch?.[1];

  const terminal = useLiveQuery(
    (q) =>
      q
        .from({ terminal: getTerminalsCollection(projectId) })
        .where(({ terminal }) => eq(terminal.id, terminalId ?? ""))
        .findOne(),
    [terminalId],
  );
  const agent = useLiveQuery(
    (q) =>
      q
        .from({ agent: getAgentsCollection(projectId) })
        .where(({ agent }) => eq(agent.id, agentId ?? ""))
        .findOne(),
    [agentId],
  );

  const breadcrumb = useMemo(() => {
    const projectName = projectId ?? "Project";

    if (terminalId && terminal.data) {
      return { projectName, type: "Terminal" as const, name: terminal.data.name };
    }

    if (agentId && agent.data) {
      return { projectName, type: "Agent" as const, name: agent.data.name };
    }

    return { projectName, type: null, name: null };
  }, [projectId, terminalId, terminal.data, agentId, agent.data]);

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
