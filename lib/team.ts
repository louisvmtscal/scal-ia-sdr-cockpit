import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/generated/prisma/enums";

export type TeamMember = { id: string; name: string | null; email: string };
export type TeamMemberWithRole = TeamMember & { role: Role };

/** Liste des comptes pouvant être commercial sur un RDV — pour peupler les sélecteurs. */
export async function getTeamMembers(): Promise<TeamMember[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

/** Liste des comptes avec leur rôle — pour la page Paramètres (admin uniquement). */
export async function getTeamMembersWithRole(): Promise<TeamMemberWithRole[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}
