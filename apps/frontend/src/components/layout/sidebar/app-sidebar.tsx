import * as React from "react";

import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavProjects } from "@/components/layout/sidebar/nav-projects";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { TeamSwitcher } from "@/components/layout/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  RiGalleryLine,
  RiPulseLine,
  RiCommandLine,
  RiCropLine,
  RiPieChartLine,
  RiMapLine,
  RiRobot2Line,
  RiTerminalBoxLine,
} from "@remixicon/react";
import type { AgentMetadata, TerminalMetadata } from "@pixxl/shared";
import { useCreateAgent } from "@/features/agent/hooks/use-agent";
import { useCreateTerminal } from "@/features/terminal/hooks/use-terminal";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  projectId: string;
  agents?: AgentMetadata[];
  terminals?: TerminalMetadata[];
  isAgentsLoading?: boolean;
  isTerminalsLoading?: boolean;
  onEditAgent?: (agent: AgentMetadata) => void;
  onEditTerminal?: (terminal: TerminalMetadata) => void;
  onAddCommand?: () => void;
}

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: <RiGalleryLine />,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: <RiPulseLine />,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: <RiCommandLine />,
      plan: "Free",
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: <RiCropLine />,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: <RiPieChartLine />,
    },
    {
      name: "Travel",
      url: "#",
      icon: <RiMapLine />,
    },
  ],
};

const EmptyItem = { title: "", url: "#", disabled: true } as const;

export function AppSidebar({
  projectId,
  agents = [],
  terminals = [],
  isAgentsLoading = false,
  isTerminalsLoading = false,
  onEditAgent,
  onEditTerminal,
  onAddCommand,
  ...props
}: AppSidebarProps) {
  const createAgent = useCreateAgent();
  const createTerminal = useCreateTerminal();

  const agentCount = agents.length;
  const terminalCount = terminals.length;

  const handleAddAgent = React.useCallback(() => {
    const name = `agent-${agentCount + 1}`;
    createAgent.mutate({ projectId, name });
  }, [projectId, agentCount, createAgent]);

  const handleAddTerminal = React.useCallback(() => {
    const name = `terminal-${terminalCount + 1}`;
    createTerminal.mutate({ projectId, name });
  }, [projectId, terminalCount, createTerminal]);

  const navMain = React.useMemo(
    () => [
      {
        title: "Agents",
        url: "#",
        icon: <RiRobot2Line />,
        isActive: true,
        items:
          isAgentsLoading || agents.length === 0
            ? [EmptyItem, { title: "+ Add Agent", url: "#" }]
            : [
                ...agents.map((agent) => ({
                  title: agent.name,
                  url: "#",
                  id: agent.id,
                  onEdit: onEditAgent ? () => onEditAgent(agent) : undefined,
                })),
                { title: "+ Add Agent", url: "#", onClick: handleAddAgent },
              ],
      },
      {
        title: "Terminals",
        url: "#",
        icon: <RiTerminalBoxLine />,
        items:
          isTerminalsLoading || terminals.length === 0
            ? [EmptyItem, { title: "+ Add Terminal", url: "#" }]
            : [
                ...terminals.map((terminal) => ({
                  title: terminal.name,
                  url: "#",
                  id: terminal.id,
                  onEdit: onEditTerminal ? () => onEditTerminal(terminal) : undefined,
                })),
                { title: "+ Add Terminal", url: "#", onClick: handleAddTerminal },
              ],
      },
      {
        title: "Commands",
        url: "#",
        icon: <RiCommandLine />,
        items: [EmptyItem, { title: "+ Add Command", url: "#", onClick: onAddCommand }],
      },
    ],
    [
      agents,
      terminals,
      isAgentsLoading,
      isTerminalsLoading,
      handleAddAgent,
      handleAddTerminal,
      onEditAgent,
      onEditTerminal,
      onAddCommand,
    ],
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
