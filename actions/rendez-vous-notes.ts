"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type NoteActionResult = { error: string } | { success: true };

export async function addNoteAction(rendezVousId: string, contenu: string): Promise<NoteActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Session invalide, merci de te reconnecter." };
  }

  const texte = contenu.trim();
  if (!texte) {
    return { error: "La note ne peut pas être vide." };
  }

  await prisma.rendezVousNote.create({
    data: { rendezVousId, authorId: session.user.id, contenu: texte },
  });

  revalidatePath("/rendez-vous");
  return { success: true };
}

/** Un membre peut supprimer sa propre note ; un admin peut supprimer n'importe laquelle (modération). */
export async function deleteNoteAction(noteId: string): Promise<NoteActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Session invalide, merci de te reconnecter." };
  }

  const note = await prisma.rendezVousNote.findUnique({ where: { id: noteId } });
  if (!note) {
    return { success: true };
  }

  if (note.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "Tu ne peux supprimer que tes propres notes." };
  }

  await prisma.rendezVousNote.delete({ where: { id: noteId } });
  revalidatePath("/rendez-vous");
  return { success: true };
}
