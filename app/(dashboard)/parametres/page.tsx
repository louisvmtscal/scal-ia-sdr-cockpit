import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TeamRoleTable } from "@/components/parametres/team-role-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getTeamMembersWithRole } from "@/lib/team";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const teamMembers = await getTeamMembersWithRole();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Paramètres</h1>
        <p className="text-muted-foreground text-sm">
          Vue Admin : accès à tous les rendez-vous de l&apos;équipe et aux Automatisations. Vue SDR :
          uniquement ses propres rendez-vous.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Équipe</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamRoleTable teamMembers={teamMembers} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
