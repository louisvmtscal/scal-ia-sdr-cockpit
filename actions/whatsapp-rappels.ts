"use server";

import { envoyerWhatsappTest } from "@/services/whatsapp-rappels";

export type EnvoyerWhatsappTestResult = { success: true; externalId: string } | { error: string };

/**
 * Réservé au développement. N'affecte jamais les statuts J-1/H-2 réels —
 * sert uniquement à vérifier la configuration Lemlist (campagne + compte
 * WhatsApp connecté) avec le numéro d'un rendez-vous donné.
 */
export async function envoyerWhatsappTestAction(
  rendezVousId: string,
): Promise<EnvoyerWhatsappTestResult> {
  if (!process.env.LEMLIST_API_KEY) {
    return { error: "LEMLIST_API_KEY manquante. Configure-la dans .env." };
  }

  try {
    const result = await envoyerWhatsappTest(rendezVousId);
    if (!result.success) {
      return { error: result.error };
    }
    return { success: true, externalId: result.externalId };
  } catch (error) {
    console.error("Erreur WhatsApp test :", error);
    return { error: "L'envoi du message WhatsApp test a échoué." };
  }
}
