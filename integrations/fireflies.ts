import { createHmac, timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Vérifie la signature HMAC-SHA256 (header `x-hub-signature`) d'un webhook
 * Fireflies. Les appels GraphQL (recherche, récupération de réunion et de
 * transcription) vivent dans `services/fireflies/` — voir ce répertoire pour
 * le client API.
 */
export function verifyFirefliesSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(expected, signature);
}
