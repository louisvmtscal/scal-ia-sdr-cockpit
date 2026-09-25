"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import type { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type UpdateRoleResult = { error: string } | { success: true };

/** Vue simplifiée exposée dans Paramètres : Admin (tout voir) ou SDR (ses propres RDV). */
const ROLES_AUTORISES: Role[] = ["ADMIN", "SDR"];

export async function updateUserRoleAction(userId: string, role: Role): Promise<UpdateRoleResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Réservé aux administrateurs." };
  }

  if (!ROLES_AUTORISES.includes(role)) {
    return { error: "Rôle invalide." };
  }

  if (role !== "ADMIN") {
    const autresAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: userId } },
    });
    if (autresAdmins === 0) {
      return { error: "Impossible de retirer le dernier compte admin." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/parametres");
  return { success: true };
}
