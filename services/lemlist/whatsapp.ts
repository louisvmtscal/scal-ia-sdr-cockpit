import "server-only";

import { LemlistApiError, lemlistRequest } from "./client";
import type { SendWhatsappInput, SendWhatsappResult } from "./types";

type RawWhatsappResponse = { _id?: string; id?: string };

/**
 * Envoie un message WhatsApp via Lemlist (`POST /inbox/whatsapp`).
 *
 * ⚠️ Point important de l'audit API : la documentation publique Lemlist ne
 * référence AUCUN type d'étape "whatsapp" dans les séquences de campagne
 * (`GET /campaigns/{id}/sequences` ne documente que email, linkedinSend,
 * linkedinInvite, conditional). Le seul mécanisme d'envoi WhatsApp
 * documenté est cet endpoint direct de l'inbox unifiée — ce n'est PAS un
 * "step" de campagne déclenché par Lemlist lui-même. C'est pourquoi le
 * timing (J-1 / H-2) est entièrement piloté par notre cron (voir
 * services/whatsapp-rappels.ts), et la campagne Lemlist ne sert qu'à
 * organiser/retrouver le lead dans l'interface Lemlist, pas à programmer
 * l'envoi.
 *
 * Nécessite `sendUserId` et `sendUserWhatsappAccountId` (identifiants du
 * compte WhatsApp Business connecté à Lemlist — configuration à faire dans
 * Lemlist, pas via l'API) en plus d'un `contactId` ou `leadId` existant.
 */
export async function sendWhatsappMessage({
  contactId,
  leadId,
  message,
}: SendWhatsappInput): Promise<SendWhatsappResult> {
  const sendUserId = process.env.LEMLIST_WHATSAPP_SEND_USER_ID;
  const sendUserWhatsappAccountId = process.env.LEMLIST_WHATSAPP_SEND_USER_ACCOUNT_ID;

  if (!sendUserId || !sendUserWhatsappAccountId) {
    return {
      success: false,
      error: "LEMLIST_WHATSAPP_SEND_USER_ID / LEMLIST_WHATSAPP_SEND_USER_ACCOUNT_ID manquant(s).",
    };
  }

  if (!contactId && !leadId) {
    return { success: false, error: "contactId ou leadId requis pour l'envoi WhatsApp." };
  }

  try {
    const raw = await lemlistRequest<RawWhatsappResponse>("/inbox/whatsapp", {
      method: "POST",
      body: { sendUserId, sendUserWhatsappAccountId, contactId, leadId, message },
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
