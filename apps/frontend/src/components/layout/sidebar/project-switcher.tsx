import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { RiArrowUpDownLine, RiAddLine, RiFolder3Line } from "@remixicon/react";
import type { ProjectMetadata } from "@pixxl/shared";

export interface ProjectSwitcherProject {
  id: string;
  name: string;
  plan: string;
}

export interface ProjectSwitcherProps {
  projects: ProjectMetadata[];
  currentProjectId?: string;
  onSelectProject?: (project: ProjectSwitcherProject) => void;
  onAddProject?: () => void;
}

export function ProjectSwitcher(props: ProjectSwitcherProps) {
  const { isMobile } = useSidebar();
  const currentProject =
    props.projects.find((p) => p.id === props.currentProjectId) ?? props.projects[0];

  if (!currentProject) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
              <RiFolder3Line />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{currentProject.name}</span>
              <span className="truncate text-xs">{currentProject.path}</span>
            </div>
            <RiArrowUpDownLine className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Projects
              </DropdownMenuLabel>
              {props.projects.map((project, index) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => {
                    props.onSelectProject?.({
                      id: project.id,
                      name: project.name,
                      plan: project.path,
                    });
                  }}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center border">
                    <RiFolder3Line />
                  </div>
                  {project.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 p-2" onClick={props.onAddProject}>
                <div className="flex size-6 items-center justify-center border bg-transparent">
                  <RiAddLine className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Add project</div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
