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
import { RiArrowRightSLine, RiPencilLine, RiDeleteBin2Line, RiMoreLine } from "@remixicon/react";

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
  isActive?: boolean;
  items?: NavSubItem[];
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Development</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            defaultOpen={item.isActive}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.title} />}>
              {item.icon}
              <span>{item.title}</span>
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
                    <SidebarMenuSubItem key={subItem.title} className="group/item">
                      <SidebarMenuSubButton
                        render={
                          isActionItem ? (
                            <button
                              type="button"
                              onClick={subItem.onClick}
                              className="w-full text-left"
                            />
                          ) : (
                            <a href={subItem.url} />
                          )
                        }
                        className="w-full group-hover/item:bg-sidebar-accent flex items-center justify-between"
                      >
                        <span
                          className={isActionItem ? "text-muted-foreground font-normal" : undefined}
                        >
                          {subItem.title}
                        </span>
                        {hasMenu && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover/item:opacity-100 transition-none p-1 rounded cursor-pointer"
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
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
