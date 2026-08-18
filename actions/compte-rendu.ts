"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

import { compteRenduSchema, type CompteRendu } from "@/lib/validations/compte-rendu";
import { genererEtEnregistrerCompteRendu, modifierCompteRendu } from "@/services/compte-rendu";

export type GenererCompteRenduResult =
  { success: true; compteRendu: CompteRendu } | { error: string };

export async function genererCompteRenduAction(
  rendezVousId: string,
  texteSource: string,
): Promise<GenererCompteRenduResult> {
  if (!texteSource.trim()) {
    return {
      error: "Impossible de générer le compte rendu. Vérifie que la transcription Fireflies est disponible.",
    };
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

export type ModifierCompteRenduResult =
  { success: true; compteRendu: CompteRendu } | { error: string };

/** Sauvegarde manuelle : aucun appel IA, aucun email — l'utilisateur a modifié le contenu lui-même. */
export async function modifierCompteRenduAction(
  rendezVousId: string,
  compteRendu: CompteRendu,
): Promise<ModifierCompteRenduResult> {
  const parsed = compteRenduSchema.safeParse(compteRendu);

  if (!parsed.success) {
    return { error: "Formulaire invalide, merci de vérifier les champs." };
  }

  try {
    await modifierCompteRendu(rendezVousId, parsed.data);
    revalidatePath("/rendez-vous");
    return { success: true, compteRendu: parsed.data };
  } catch (error) {
    console.error("Erreur modification compte rendu :", error);
    return { error: "La modification a échoué." };
  }
}
