"use client";

import { CalendarCheck2Icon, LayoutDashboardIcon, SettingsIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { NavUser } from "@/components/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboardIcon },
  { title: "Rendez-vous", url: "/rendez-vous", icon: CalendarCheck2Icon },
  { title: "Automatisations", url: "/automatisations", icon: ZapIcon },
  { title: "Paramètres", url: "/parametres", icon: SettingsIcon },
];

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & {
  user: { name?: string | null; email?: string | null; role: string };
}) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.url === "/automatisations") return user.role !== "SDR";
    if (item.url === "/parametres") return user.role === "ADMIN";
    return true;
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/">
                  <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-semibold">
                    S
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Scal-IA</span>
                    <span className="text-muted-foreground truncate text-xs">Cockpit SDR</span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    render={
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
