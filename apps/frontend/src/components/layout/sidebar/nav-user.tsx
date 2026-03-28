import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { RiSettingsLine } from "@remixicon/react";

interface NavUserProps {
  onClick?: () => void;
}

export function NavUser({ onClick }: NavUserProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" onClick={onClick} className="cursor-pointer">
          <RiSettingsLine className="size-5" />
          <span className="truncate font-medium">Settings</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
