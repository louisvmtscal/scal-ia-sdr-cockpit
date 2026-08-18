"use server";

import { revalidatePath } from "next/cache";

import type { EmailJ25 } from "@/lib/validations/email-j25";
import { genererEmailJ25, modifierEmailJ25 } from "@/services/email-j25";

export type EmailJ25ActionResult = { success: true; emailJ25: EmailJ25 } | { error: string };

export async function genererEmailJ25Action(rendezVousId: string): Promise<EmailJ25ActionResult> {
  try {
    const emailJ25 = await genererEmailJ25(rendezVousId);
    revalidatePath("/rendez-vous");
    return { success: true, emailJ25 };
  } catch (error) {
    console.error("Erreur génération Email J-25 :", error);
    return { error: "La génération du brouillon a échoué." };
  }
}

export async function modifierEmailJ25Action(
  rendezVousId: string,
  contenu: string,
): Promise<EmailJ25ActionResult> {
  if (!contenu.trim()) {
    return { error: "Le brouillon ne peut pas être vide." };
  }

  try {
    const emailJ25 = await modifierEmailJ25(rendezVousId, contenu);
    revalidatePath("/rendez-vous");
    return { success: true, emailJ25 };
  } catch (error) {
    console.error("Erreur modification Email J-25 :", error);
    return { error: "La modification a échoué." };
  }
}
