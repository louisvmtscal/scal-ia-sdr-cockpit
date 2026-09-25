import { prisma } from "@/lib/prisma";

export type TeamMember = { id: string; name: string | null; email: string };

/** Liste des comptes pouvant être commercial sur un RDV — pour peupler les sélecteurs. */
export async function getTeamMembers(): Promise<TeamMember[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
