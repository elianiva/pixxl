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
import type { Agent } from "@pixxl/shared";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  agents?: Agent[];
  isAgentsLoading?: boolean;
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
  navMain: [
    {
      title: "Agents",
      url: "#",
      icon: <RiRobot2Line />,
      isActive: true,
      items: [],
    },
    {
      title: "Commands",
      url: "#",
      icon: <RiTerminalBoxLine />,
      items: [],
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

export function AppSidebar({ agents = [], isAgentsLoading = false, ...props }: AppSidebarProps) {
  const navMain = React.useMemo(
    () => [
      {
        title: "Agents",
        url: "#",
        icon: <RiRobot2Line />,
        isActive: true,
        items: isAgentsLoading
          ? [{ title: "Loading...", url: "#" }]
          : agents.map((agent) => ({
              title: agent.name,
              url: `#`,
            })),
      },
      {
        title: "Commands",
        url: "#",
        icon: <RiTerminalBoxLine />,
        items: [],
      },
    ],
    [agents, isAgentsLoading],
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
