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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  _projectId?: string;
  agents?: AgentMetadata[];
  terminals?: TerminalMetadata[];
  isAgentsLoading?: boolean;
  isTerminalsLoading?: boolean;
  onAddAgent?: () => void;
  onAddTerminal?: () => void;
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
  _projectId,
  agents = [],
  terminals = [],
  isAgentsLoading = false,
  isTerminalsLoading = false,
  onAddAgent,
  onAddTerminal,
  onAddCommand,
  ...props
}: AppSidebarProps) {
  const navMain = React.useMemo(
    () => [
      {
        title: "Agents",
        url: "#",
        icon: <RiRobot2Line />,
        isActive: true,
        items: isAgentsLoading
          ? [EmptyItem, { title: "+ Add Agent", url: "#" }]
          : agents.length === 0
            ? [EmptyItem, { title: "+ Add Agent", url: "#" }]
            : [
                ...agents.map((agent) => ({
                  title: agent.name,
                  url: `#`,
                })),
                { title: "+ Add Agent", url: "#", onClick: onAddAgent },
              ],
      },
      {
        title: "Terminals",
        url: "#",
        icon: <RiTerminalBoxLine />,
        items: isTerminalsLoading
          ? [EmptyItem, { title: "+ Add Terminal", url: "#" }]
          : terminals.length === 0
            ? [EmptyItem, { title: "+ Add Terminal", url: "#" }]
            : [
                ...terminals.map((terminal) => ({
                  title: terminal.name,
                  url: `#`,
                })),
                { title: "+ Add Terminal", url: "#", onClick: onAddTerminal },
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
      onAddAgent,
      onAddTerminal,
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
