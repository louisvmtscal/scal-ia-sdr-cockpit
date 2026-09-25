import { NouveauRendezVousDialog } from "@/components/rendez-vous/nouveau-rendez-vous-dialog";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Role } from "@/lib/generated/prisma/enums";
import type { TeamMember } from "@/lib/team";

export function SiteHeader({
  title,
  teamMembers,
  currentUser,
}: {
  title?: string;
  teamMembers: TeamMember[];
  currentUser: { id: string; role: Role };
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="flex-1 text-sm font-medium">{title}</h1>
      <NouveauRendezVousDialog teamMembers={teamMembers} currentUser={currentUser} />
      <ThemeToggle />
    </header>
  );
}
