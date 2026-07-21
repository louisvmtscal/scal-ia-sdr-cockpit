"use server";

import { revalidatePath } from "next/cache";

import type { Preparation } from "@/lib/validations/preparation";
import { genererEtEnregistrerPreparation } from "@/services/preparation";

export type GenererPreparationResult =
  { success: true; preparation: Preparation } | { error: string };

export async function genererPreparationAction(
  rendezVousId: string,
): Promise<GenererPreparationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error: "Clé API Anthropic manquante. Configure ANTHROPIC_API_KEY dans .env.",
    };
  }

  try {
    const preparation = await genererEtEnregistrerPreparation(rendezVousId);
    revalidatePath("/rendez-vous");
    return { success: true, preparation };
  } catch (error) {
    console.error("Erreur génération préparation :", error);
    return { error: error instanceof Error ? error.message : "La génération a échoué." };
  }
}
