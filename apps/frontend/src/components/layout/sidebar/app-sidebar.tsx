import * as React from "react";

import { NavMain, NavSubItem } from "@/components/layout/sidebar/nav-main";
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
import type { AgentMetadata, TerminalMetadata, CommandMetadata } from "@pixxl/shared";
import { useCreateAgent } from "@/features/agent/hooks/use-agent";
import { useCreateTerminal } from "@/features/terminal/hooks/use-terminal";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  projectId: string;
  agents?: AgentMetadata[];
  terminals?: TerminalMetadata[];
  commands?: CommandMetadata[];
  isAgentsLoading?: boolean;
  isTerminalsLoading?: boolean;
  isCommandsLoading?: boolean;
  onEditAgent?: (agent: AgentMetadata) => void;
  onEditTerminal?: (terminal: TerminalMetadata) => void;
  onEditCommand?: (command: CommandMetadata) => void;
  onDeleteAgent?: (agent: AgentMetadata) => void;
  onDeleteTerminal?: (terminal: TerminalMetadata) => void;
  onDeleteCommand?: (command: CommandMetadata) => void;
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

const EmptyItem: NavSubItem = { title: "", url: "#", disabled: true };

interface CreateMenuItemsOptions<T extends { id: string; name: string }> {
  items: T[];
  onAdd: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  isLoading: boolean;
  addLabel: string;
}

function createMenuItems<T extends { id: string; name: string }>({
  items,
  onAdd,
  onEdit,
  onDelete,
  isLoading,
  addLabel,
}: CreateMenuItemsOptions<T>): NavSubItem[] {
  const addItem: NavSubItem = { title: `+ Add ${addLabel}`, url: "#", onClick: onAdd };

  if (isLoading || items.length === 0) {
    return [EmptyItem, addItem];
  }

  return [
    ...items.map((item) => ({
      title: item.name,
      url: "#",
      id: item.id,
      onEdit: onEdit ? () => onEdit(item) : undefined,
      onDelete: onDelete ? () => onDelete(item) : undefined,
    })),
    addItem,
  ];
}

export function AppSidebar({
  projectId,
  agents = [],
  terminals = [],
  commands = [],
  isAgentsLoading = false,
  isTerminalsLoading = false,
  isCommandsLoading = false,
  onEditAgent,
  onEditTerminal,
  onEditCommand,
  onDeleteAgent,
  onDeleteTerminal,
  onDeleteCommand,
  onAddCommand,
  ...props
}: AppSidebarProps) {
  const createAgent = useCreateAgent();
  const createTerminal = useCreateTerminal();

  const agentCount = agents.length;
  const terminalCount = terminals.length;

  const handleAddAgent = React.useCallback(() => {
    const name = `Agent ${agentCount + 1}`;
    createAgent.mutate({ projectId, name });
  }, [projectId, agentCount, createAgent]);

  const handleAddTerminal = React.useCallback(() => {
    const name = `Terminal ${terminalCount + 1}`;
    createTerminal.mutate({ projectId, name });
  }, [projectId, terminalCount, createTerminal]);

  const navMain = React.useMemo(
    () => [
      {
        title: "Agents",
        url: "#",
        icon: <RiRobot2Line />,
        isActive: true,
        items: createMenuItems({
          items: agents,
          onAdd: handleAddAgent,
          onEdit: onEditAgent,
          onDelete: onDeleteAgent,
          isLoading: isAgentsLoading,
          addLabel: "Agent",
        }),
      },
      {
        title: "Terminals",
        url: "#",
        icon: <RiTerminalBoxLine />,
        items: createMenuItems({
          items: terminals,
          onAdd: handleAddTerminal,
          onEdit: onEditTerminal,
          onDelete: onDeleteTerminal,
          isLoading: isTerminalsLoading,
          addLabel: "Terminal",
        }),
      },
      {
        title: "Commands",
        url: "#",
        icon: <RiCommandLine />,
        items: createMenuItems({
          items: commands,
          onAdd: onAddCommand ?? (() => {}),
          onEdit: onEditCommand,
          onDelete: onDeleteCommand,
          isLoading: isCommandsLoading,
          addLabel: "Command",
        }),
      },
    ],
    [
      agents,
      terminals,
      commands,
      isAgentsLoading,
      isTerminalsLoading,
      isCommandsLoading,
      handleAddAgent,
      handleAddTerminal,
      onEditAgent,
      onEditTerminal,
      onEditCommand,
      onDeleteAgent,
      onDeleteTerminal,
      onDeleteCommand,
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
