import "server-only";

import { brevoFetch } from "./client";
import type { BrevoSmsResponse, SendSmsInput, SendSmsResult } from "./types";

/**
 * Envoie un SMS transactionnel via l'API Brevo.
 *
 * - N'appelle jamais Brevo sans `BREVO_SMS_SENDER` configuré.
 * - Ne journalise jamais `BREVO_API_KEY` (voir `brevoFetch`).
 * - Retourne toujours un résultat structuré, jamais une exception : c'est à
 *   l'appelant (services/sms-rappels.ts) de décider quoi faire de l'échec
 *   (statut FAILED + `smsLastError`).
 */
export async function sendSms({ phone, message }: SendSmsInput): Promise<SendSmsResult> {
  const sender = process.env.BREVO_SMS_SENDER;

  if (!sender) {
    return { success: false, error: "BREVO_SMS_SENDER manquant." };
  }

  const result = await brevoFetch<BrevoSmsResponse>("/transactionalSMS/sms", {
    method: "POST",
    body: {
      sender,
      recipient: phone,
      content: message,
      type: "transactional",
    },
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const messageId = result.data.messageId ?? result.data.reference;

  if (!messageId) {
    return { success: false, error: "Réponse Brevo sans identifiant de message." };
  }

  return { success: true, messageId: String(messageId) };
}
