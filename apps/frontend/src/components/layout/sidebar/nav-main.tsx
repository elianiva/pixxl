import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  RiArrowRightSLine,
  RiPencilLine,
  RiDeleteBin2Line,
  RiMoreLine,
  RiDashboardLine,
  RiTrelloLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link, useParams } from "@tanstack/react-router";

export interface NavSubItem {
  title: string;
  url: string;
  disabled?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface NavItem {
  title: string;
  url: string;
  icon?: React.ReactNode;
  items?: NavSubItem[];
}

export function NavMain({ items }: { items: NavItem[] }) {
  const projectId = useParams({ select: (p) => p.projectId as string, strict: false });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Development</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuButton
          tooltip="Dashboard"
          render={<Link to="/app/$projectId/dashboard" params={{ projectId }} />}
        >
          <RiDashboardLine />
          <span>Dashboard</span>
        </SidebarMenuButton>
      </SidebarMenu>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            defaultOpen
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger
              render={<SidebarMenuButton tooltip={item.title} />}
              className="flex items-center"
            >
              {item.icon}
              <span>{item.title}</span>
              <Separator className="flex-1" />
              <RiArrowRightSLine className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem, index) => {
                  if (subItem.title === "" || subItem.disabled) {
                    return (
                      <SidebarMenuSubItem key={`empty-${index}`}>
                        <SidebarMenuSubButton
                          render={<span />}
                          className={cn(
                            subItem.disabled &&
                              "text-muted-foreground hover:bg-transparent active:bg-transparent hover:text-muted-foreground active:text-muted-foreground opacity-50",
                          )}
                        >
                          <span>No {item.title.toLowerCase()}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  }
                  const isActionItem = subItem.onClick !== undefined;
                  const hasMenu = Boolean(subItem.onEdit) || Boolean(subItem.onDelete);

                  return (
                    <SidebarMenuSubItem
                      key={subItem.title}
                      className="group/item flex items-stretch gap-0 hover:bg-sidebar-accent"
                    >
                      <SidebarMenuSubButton
                        render={
                          isActionItem ? (
                            <button
                              type="button"
                              onClick={subItem.onClick}
                              className="w-full text-left"
                            />
                          ) : (
                            <Link to={subItem.url} />
                          )
                        }
                        className="w-full flex-1"
                      >
                        <span
                          className={isActionItem ? "text-muted-foreground font-normal" : undefined}
                        >
                          {subItem.title}
                        </span>
                      </SidebarMenuSubButton>
                      {hasMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover/item:opacity-100 transition-none cursor-pointer"
                            render={<Button variant="ghost" size="icon-sm" />}
                          >
                            <RiMoreLine className="size-3.5 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {subItem.onEdit && (
                              <DropdownMenuItem onClick={subItem.onEdit}>
                                <RiPencilLine className="size-3.5" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                            )}
                            {subItem.onDelete && (
                              <DropdownMenuItem variant="destructive" onClick={subItem.onDelete}>
                                <RiDeleteBin2Line className="size-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SidebarMenu>
      <SidebarMenu>
        <SidebarMenuButton tooltip="Dashboard">
          <RiTrelloLine />
          <span>Task Management</span>
        </SidebarMenuButton>
      </SidebarMenu>
    </SidebarGroup>
  );
}
