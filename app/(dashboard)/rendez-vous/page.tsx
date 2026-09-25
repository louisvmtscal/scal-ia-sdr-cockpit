import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RendezVousTable } from "@/components/rendez-vous/rendez-vous-table";
import { auth } from "@/lib/auth";
import { getTeamMembers } from "@/lib/team";
import { listRendezVous } from "@/services/rendez-vous";

export const metadata: Metadata = {
  title: "Rendez-vous",
};

export default async function RendezVousPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const scope = { userId: session.user.id, role: session.user.role };

  const [rendezVous, teamMembers] = await Promise.all([
    listRendezVous(scope),
    getTeamMembers(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Suivi des rendez-vous</h1>
        <p className="text-muted-foreground text-sm">{rendezVous.length} rendez-vous au total</p>
      </div>
      <RendezVousTable
        data={rendezVous}
        teamMembers={teamMembers}
        currentUser={{ id: scope.userId, role: scope.role }}
        isDev={process.env.NODE_ENV !== "production"}
      />
    </div>
  );
}
