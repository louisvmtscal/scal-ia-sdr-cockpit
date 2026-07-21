"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

import type { CompteRendu } from "@/lib/validations/compte-rendu";
import { genererEtEnregistrerCompteRendu } from "@/services/compte-rendu";

export type GenererCompteRenduResult =
  { success: true; compteRendu: CompteRendu } | { error: string };

export async function genererCompteRenduAction(
  rendezVousId: string,
  texteSource: string,
): Promise<GenererCompteRenduResult> {
  if (!texteSource.trim()) {
    return { error: "Merci de coller une transcription ou des notes." };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error: "Clé API Anthropic manquante. Configure ANTHROPIC_API_KEY dans .env.",
    };
  }

  try {
    const compteRendu = await genererEtEnregistrerCompteRendu(rendezVousId, texteSource);
    revalidatePath("/rendez-vous");
    return { success: true, compteRendu };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { error: "Clé API Anthropic invalide." };
    }

    console.error("Erreur génération compte rendu :", error);
    return { error: "La génération de la synthèse a échoué." };
  }
}
