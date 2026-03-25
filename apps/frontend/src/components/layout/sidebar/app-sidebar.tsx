import * as React from "react";
import { NavMain, NavSubItem } from "@/components/layout/sidebar/nav-main";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { ProjectSwitcher } from "@/components/layout/sidebar/project-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { RiCommandLine, RiRobot2Line, RiTerminalBoxLine } from "@remixicon/react";
import type {
  AgentMetadata,
  CommandMetadata,
  ProjectMetadata,
  TerminalMetadata,
} from "@pixxl/shared";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  projects: ProjectMetadata[];
  currentProjectId?: string;
  agents: AgentMetadata[];
  terminals: TerminalMetadata[];
  commands: CommandMetadata[];
  isLoading: boolean;
  onSelectProject?: (project: { id: string }) => void;
  onAddProject?: () => void;
  actions: {
    agents: {
      edit?: (agent: AgentMetadata) => void;
      delete?: (id: string) => void;
      create?: (name: string) => void;
    };
    terminals: {
      edit?: (terminal: TerminalMetadata) => void;
      delete?: (id: string) => void;
      create?: (name: string) => void;
    };
    commands: {
      add?: () => void;
      delete?: (id: string) => void;
    };
  };
}

const EmptyItem: NavSubItem = { title: "", url: "#", disabled: true };

interface CreateMenuItemsOptions<T extends { id: string; name: string }> {
  items: T[];
  onAdd?: () => void;
  getUrl?: (item: T) => string;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  isLoading: boolean;
  addLabel: string;
}

function createMenuItems<T extends { id: string; name: string }>(
  options: CreateMenuItemsOptions<T>,
): NavSubItem[] {
  const addItem: NavSubItem = options.onAdd
    ? { title: `+ Add ${options.addLabel}`, url: "#", onClick: options.onAdd }
    : EmptyItem;

  if (options.isLoading || options.items.length === 0) {
    return [EmptyItem, addItem];
  }

  return [
    ...options.items
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        title: item.name,
        url: options.getUrl ? options.getUrl(item) : "#",
        id: item.id,
        onEdit: options.onEdit ? () => options.onEdit!(item) : undefined,
        onDelete: options.onDelete ? () => options.onDelete!(item.id) : undefined,
      })),
    addItem,
  ];
}

export function AppSidebar({
  projects,
  currentProjectId,
  agents,
  terminals,
  commands,
  isLoading,
  onSelectProject,
  onAddProject,
  actions,
  ...sidebarProps
}: AppSidebarProps) {
  const navMain = React.useMemo(
    () => [
      {
        title: "Agents",
        url: currentProjectId ? `/app/${currentProjectId}/agent` : "#",
        icon: <RiRobot2Line />,
        items: createMenuItems({
          items: agents,
          onAdd: actions.agents.create
            ? () => actions.agents.create!(`Agent ${agents.length + 1}`)
            : undefined,
          getUrl: (agent) => `/app/${agent.id}`,
          onEdit: actions.agents.edit,
          onDelete: actions.agents.delete,
          isLoading,
          addLabel: "Agent",
        }),
      },
      {
        title: "Terminals",
        url: "#",
        icon: <RiTerminalBoxLine />,
        items: createMenuItems({
          items: terminals,
          onAdd: actions.terminals.create
            ? () => actions.terminals.create!(`Terminal ${terminals.length + 1}`)
            : undefined,
          getUrl: (terminal) => `/terminal/${terminal.id}`,
          onEdit: actions.terminals.edit,
          onDelete: actions.terminals.delete,
          isLoading,
          addLabel: "Terminal",
        }),
      },
      {
        title: "Commands",
        url: "#",
        icon: <RiCommandLine />,
        items: createMenuItems<CommandMetadata>({
          items: commands,
          onAdd: actions.commands.add,
          getUrl: (cmd) => `/app/${currentProjectId}/command/${cmd.id}`,
          onDelete: actions.commands.delete,
          isLoading: false,
          addLabel: "Command",
        }),
      },
    ],
    [actions, agents, commands, currentProjectId, isLoading, terminals],
  );

  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
      <SidebarHeader>
        <ProjectSwitcher
          projects={projects}
          currentProjectId={currentProjectId}
          onSelectProject={onSelectProject}
          onAddProject={onAddProject}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: "shadcn", email: "m@example.com", avatar: "/avatars/shadcn.jpg" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
