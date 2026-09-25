import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { getTeamMembers } from "@/lib/team";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/connexion");
  }

  const [cookieStore, teamMembers] = await Promise.all([cookies(), getTeamMembers()]);
  const sidebarState = cookieStore.get("sidebar_state")?.value;

  return (
    <SidebarProvider defaultOpen={sidebarState !== "false"}>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <SiteHeader
          teamMembers={teamMembers}
          currentUser={{ id: session.user.id, role: session.user.role }}
        />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
