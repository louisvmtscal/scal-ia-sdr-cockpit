"use server";

import { envoyerSmsTest } from "@/services/sms-rappels";

export type EnvoyerSmsTestResult = { success: true; messageId: string } | { error: string };

/**
 * Réservé au développement (bouton "Envoyer un SMS test" masqué en
 * production côté UI). N'affecte jamais les statuts J-1 ou H-2 réels : sert
 * uniquement à vérifier la configuration Brevo.
 */
export async function envoyerSmsTestAction(rendezVousId: string): Promise<EnvoyerSmsTestResult> {
  if (!process.env.BREVO_API_KEY) {
    return { error: "BREVO_API_KEY manquante. Configure-la dans .env." };
  }

  try {
    const result = await envoyerSmsTest(rendezVousId);
    if (!result.success) {
      return { error: result.error };
    }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Erreur SMS test :", error);
    return { error: "L'envoi du SMS test a échoué." };
  }
}
