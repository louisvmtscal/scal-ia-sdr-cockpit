import "server-only";

import { LemlistApiError, lemlistRequest } from "./client";
import type { SendSmsInput, SendSmsResult } from "./types";

type RawSmsResponse = { _id?: string; id?: string };

/**
 * Envoie un SMS via Lemlist (`POST /inbox/sms`).
 *
 * Vérifié dans la doc officielle Lemlist (endpoint distinct de WhatsApp,
 * même famille "inbox") : nécessite `sendUserId` (utilisateur de l'équipe
 * qui envoie) et `from` (numéro provisionné sur l'équipe Lemlist, format
 * E.164 — ex: "+33600000000"), en plus d'un `contactId` ou `leadId`
 * existant. Chaque segment de message consomme un crédit SMS Lemlist.
 *
 * Comme pour WhatsApp (voir whatsapp.ts), aucun "step" de campagne SMS
 * n'est documenté : c'est un envoi direct, le timing reste piloté par
 * notre propre cron.
 */
export async function sendSms({
  contactId,
  leadId,
  message,
}: SendSmsInput): Promise<SendSmsResult> {
  const sendUserId = process.env.LEMLIST_SMS_SEND_USER_ID;
  const from = process.env.LEMLIST_SMS_FROM;

  if (!sendUserId || !from) {
    return {
      success: false,
      error: "LEMLIST_SMS_SEND_USER_ID / LEMLIST_SMS_FROM manquant(s).",
    };
  }

  if (!contactId && !leadId) {
    return { success: false, error: "contactId ou leadId requis pour l'envoi SMS." };
  }

  try {
    const raw = await lemlistRequest<RawSmsResponse>("/inbox/sms", {
      method: "POST",
      body: { sendUserId, from, contactId, leadId, message },
    });
    const externalId = raw._id ?? raw.id;
    if (!externalId) {
      return { success: false, error: "Réponse Lemlist sans identifiant de message." };
    }
    return { success: true, externalId };
  } catch (error) {
    if (error instanceof LemlistApiError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}
