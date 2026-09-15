"use server";

import { envoyerRappelJourJTest } from "@/services/rappel-jour-j";

export type EnvoyerRappelJourJTestResult = { success: true; messageId: string } | { error: string };

/**
 * Réservé au développement (bouton masqué en production côté UI).
 * N'affecte jamais le statut jour J réel : sert uniquement à vérifier la
 * configuration Brevo.
 */
export async function envoyerRappelJourJTestAction(
  rendezVousId: string,
): Promise<EnvoyerRappelJourJTestResult> {
  if (!process.env.BREVO_API_KEY) {
    return { error: "BREVO_API_KEY manquante. Configure-la dans .env." };
  }

  try {
    const result = await envoyerRappelJourJTest(rendezVousId);
    if (!result.success) {
      return { error: result.error };
    }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Erreur rappel jour J test :", error);
    return { error: "L'envoi du SMS test a échoué." };
  }
}
